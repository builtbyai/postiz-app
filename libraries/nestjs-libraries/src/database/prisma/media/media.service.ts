import { HttpException, Injectable } from '@nestjs/common';
import { MediaRepository } from '@gitroom/nestjs-libraries/database/prisma/media/media.repository';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { generationError } from '@gitroom/nestjs-libraries/openai/generation.error';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { Organization } from '@prisma/client';
import { SaveMediaInformationDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.information.dto';
import { VideoManager } from '@gitroom/nestjs-libraries/videos/video.manager';
import { VideoDto } from '@gitroom/nestjs-libraries/dtos/videos/video.dto';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import {
  AuthorizationActions,
  Sections,
  SubscriptionException,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';

@Injectable()
export class MediaService {
  private storage = UploadFactory.createStorage();

  constructor(
    private _mediaRepository: MediaRepository,
    private _openAi: OpenaiService,
    private _subscriptionService: SubscriptionService,
    private _videoManager: VideoManager
  ) {}

  async deleteMedia(org: string, id: string) {
    return this._mediaRepository.deleteMedia(org, id);
  }

  getMediaById(id: string) {
    return this._mediaRepository.getMediaById(id);
  }

  async generateImage(
    prompt: string,
    org: Organization,
    generatePromptFirst?: boolean
  ) {
    try {
      const generating = await this._subscriptionService.useCredit(
        org,
        'ai_images',
        async () => {
          if (generatePromptFirst) {
            prompt = await this._openAi.generatePromptForPicture(prompt);
            console.log('Prompt:', prompt);
          }
          return this._openAi.generateImage(prompt);
        }
      );

      return generating;
    } catch (err) {
      throw generationError(err);
    }
  }

  saveFile(org: string, fileName: string, filePath: string, originalName?: string) {
    return this._mediaRepository.saveFile(org, fileName, filePath, originalName);
  }

  getMedia(org: string, page: number, search?: string) {
    return this._mediaRepository.getMedia(org, page, search);
  }

  saveMediaInformation(org: string, data: SaveMediaInformationDto) {
    return this._mediaRepository.saveMediaInformation(org, data);
  }

  getVideoOptions() {
    return this._videoManager.getAllVideos();
  }

  async generateVideoAllowed(org: Organization, type: string) {
    const video = this._videoManager.getVideoByName(type);
    if (!video) {
      throw new Error(`Video type ${type} not found`);
    }

    if (!video.trial && org.isTrailing) {
      throw new HttpException('This video is not available in trial mode', 406);
    }

    return true;
  }

  async generateVideo(org: Organization, body: VideoDto) {
    try {
      const totalCredits = await this._subscriptionService.checkCredits(
        org,
        'ai_videos'
      );

      if (totalCredits.credits <= 0) {
        throw new SubscriptionException({
          action: AuthorizationActions.Create,
          section: Sections.VIDEOS_PER_MONTH,
        });
      }

      const video = this._videoManager.getVideoByName(body.type);
      if (!video) {
        throw new Error(`Video type ${body.type} not found`);
      }

      if (!video.trial && org.isTrailing) {
        throw new HttpException(
          'This video is not available in trial mode',
          406
        );
      }

      console.log(body.customParams);
      await video.instance.processAndValidate(body.customParams);
      console.log('no err');

      return await this._subscriptionService.useCredit(
        org,
        'ai_videos',
        async () => {
          const loadedData = await video.instance.process(
            body.output,
            body.customParams
          );

          const file = await this.storage.uploadSimple(loadedData);
          return this.saveFile(org.id, file.split('/').pop(), file);
        }
      );
    } catch (err) {
      throw generationError(err);
    }
  }

  async videoFunction(identifier: string, functionName: string, body: any) {
    const video = this._videoManager.getVideoByName(identifier);
    if (!video) {
      throw new Error(`Video with identifier ${identifier} not found`);
    }

    // @ts-ignore
    const functionToCall = video.instance[functionName];
    if (
      typeof functionToCall !== 'function' ||
      this._videoManager.checkAvailableVideoFunction(functionToCall)
    ) {
      throw new HttpException(
        `Function ${functionName} not found on video instance`,
        400
      );
    }

    return functionToCall(body);
  }

  async generateAiCaption(org: string, id: string) {
    const media = await this._mediaRepository.getMediaById(id);
    if (!media || media.organizationId !== org) {
      throw new HttpException('Media not found', 404);
    }

    const imageResponse = await fetch(media.path);
    if (!imageResponse.ok) {
      throw new HttpException('Could not load media file', 400);
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      throw new HttpException(
        `Image too large for caption generation (${Math.round(arrayBuffer.byteLength / 1024 / 1024)}MB, max 20MB)`,
        400
      );
    }
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/png';

    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const visionModel = process.env.OLLAMA_VISION_MODEL || 'qwen2.5vl:32b';

    const descriptionPrompt =
      'Describe this image for a social media marketing caption. Cover: ' +
      'what is the main subject (product shot / screenshot / hero graphic / ' +
      'team photo / lifestyle photo)? What text or UI elements are visible? What idea ' +
      'or value proposition does it represent? What is the mood/color palette? ' +
      'Be specific and factual, 4-6 sentences.';

    const openaiKey = process.env.OPENAI_API_KEY;
    let description: string;
    if (openaiKey) {
      const openaiRes = await this.fetchWithRetry(
        'https://api.openai.com/v1/responses',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: process.env.OPENAI_VISION_MODEL || 'gpt-4.1',
            input: [
              {
                role: 'user',
                content: [
                  { type: 'input_text', text: descriptionPrompt },
                  {
                    type: 'input_image',
                    image_url: `data:${contentType};base64,${base64Image}`,
                  },
                ],
              },
            ],
          }),
        },
        { timeoutMs: 60000, retries: 1 }
      );
      if (!openaiRes.ok) {
        const errBody = await openaiRes.text().catch(() => '');
        console.error('[ai-caption] OpenAI vision call failed', openaiRes.status, errBody);
        throw new HttpException(
          `Vision model request failed: ${openaiRes.status} ${errBody}`.slice(0, 500),
          502
        );
      }
      const openaiJson: any = await openaiRes.json();
      const messageItem = (openaiJson?.output || []).find(
        (item: any) => item?.type === 'message'
      );
      const outputTextPart = (messageItem?.content || []).find(
        (part: any) => part?.type === 'output_text'
      );
      description = (outputTextPart?.text || '').trim();
      if (!description) {
        throw new HttpException('Vision model returned no description', 502);
      }
      this.logAiCaptionUsage('vision', openaiJson?.model || 'openai-vision', openaiJson?.usage);
    } else {
      const descriptionRes = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: visionModel,
          prompt: descriptionPrompt,
          images: [base64Image],
          stream: false,
        }),
      });
      if (!descriptionRes.ok) {
        throw new HttpException('Vision model request failed', 502);
      }
      const descriptionJson: any = await descriptionRes.json();
      description = (descriptionJson?.response || '').trim();
    }

    const brandName = process.env.CAPTION_BRAND_NAME || 'Ward Tech Systems';
    const brandTagline =
      process.env.CAPTION_BRAND_TAGLINE || 'AI-Powered Social Captions';

    const templatePrompt = `You are a marketing copywriter for ${brandName}.
Given this factual photo description, produce ONLY a raw JSON object (no markdown fences, no commentary) with these exact keys:
{
  "headline": "short ALL CAPS headline, hook the scroll",
  "headline2": "optional second headline clause, a resolution/pivot line, empty string if not needed",
  "hook": "one-line hook, sets stakes/problem/opportunity, tied to what's visibly in the photo",
  "body1": "first body sentence, describing how the brand turns things into one smarter workflow (do not include the brand name, it will be inserted separately)",
  "body2": "second body sentence, contrast the old scattered/manual way vs. the organized/fast/confident way",
  "bullets": ["benefit 1 verb-led", "benefit 2 verb-led", "benefit 3 verb-led", "benefit 4 verb-led", "benefit 5 verb-led"],
  "closer": "one-line punchy imperative closer, 3-5 short clauses",
  "hashtags": ["tag1", "tag2", "..."]
}
Voice rules: grounded and factual, never say revolutionary or game-changing or next-gen. Bullets are benefits not features. hashtags array should have 8-10 entries, no # symbol, theme-specific to what's in the photo.

Photo description:
${description}`;

    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    let rawFields: string;
    if (deepseekKey) {
      const deepseekRes = await this.fetchWithRetry(
        'https://api.deepseek.com/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${deepseekKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: templatePrompt }],
            response_format: { type: 'json_object' },
            stream: false,
          }),
        },
        { timeoutMs: 45000, retries: 1 }
      );
      if (!deepseekRes.ok) {
        const errBody = await deepseekRes.text().catch(() => '');
        console.error('[ai-caption] DeepSeek call failed', deepseekRes.status, errBody);
        throw new HttpException(
          `Caption model request failed: ${deepseekRes.status} ${errBody}`.slice(0, 500),
          502
        );
      }
      const deepseekJson: any = await deepseekRes.json();
      rawFields = deepseekJson?.choices?.[0]?.message?.content || '{}';
      this.logAiCaptionUsage('text', 'deepseek-chat', deepseekJson?.usage);
    } else {
      const textModel = process.env.OLLAMA_TEXT_MODEL || visionModel;
      const templateRes = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: textModel,
          prompt: templatePrompt,
          stream: false,
          format: 'json',
        }),
      });
      if (!templateRes.ok) {
        throw new HttpException('Caption model request failed', 502);
      }
      const templateJson: any = await templateRes.json();
      rawFields = templateJson?.response || '{}';
    }

    let fields: any;
    try {
      fields = JSON.parse(rawFields);
    } catch (e) {
      throw new HttpException('Caption model returned invalid JSON', 502);
    }

    const boldBrandName = MediaService.toBoldSansSerif(brandName);

    const headlineLine = fields.headline2
      ? `${(fields.headline || '').toUpperCase()}\n${(fields.headline2 || '').toUpperCase()}`
      : (fields.headline || '').toUpperCase();

    const bullets = Array.isArray(fields.bullets) ? fields.bullets.slice(0, 5) : [];
    while (bullets.length < 5) {
      bullets.push('Keep every job organized and ready to go');
    }

    const hashtagsList = Array.isArray(fields.hashtags) ? fields.hashtags : [];
    const hashtags = hashtagsList
      .map((h: string) => (h.startsWith('#') ? h : `#${h}`))
      .join(' ');

    const caption = `✨ ${headlineLine}

${fields.hook || ''}

${boldBrandName} helps you ${fields.body1 || 'turn scattered details into one smarter workflow.'}
${fields.body2 || ''}

${bullets.map((b: string) => `🟡 ${b}`).join('\n')}

✦ ${fields.closer || 'See it for yourself.'}

${brandName} | ${brandTagline}

${hashtags}`;

    return { caption };
  }

  private static toBoldSansSerif(text: string): string {
    return text
      .split('')
      .map((ch) => {
        const code = ch.charCodeAt(0);
        if (code >= 65 && code <= 90) {
          return String.fromCodePoint(0x1d5d4 + (code - 65));
        }
        if (code >= 97 && code <= 122) {
          return String.fromCodePoint(0x1d5ee + (code - 97));
        }
        if (code >= 48 && code <= 57) {
          return String.fromCodePoint(0x1d7ec + (code - 48));
        }
        return ch;
      })
      .join('');
  }

  private async fetchWithRetry(
    url: string,
    options: any,
    opts: { timeoutMs?: number; retries?: number } = {}
  ): Promise<Response> {
    const timeoutMs = opts.timeoutMs ?? 60000;
    const retries = opts.retries ?? 1;
    let lastError: any;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);
        if (res.status >= 500 && attempt < retries) {
          lastError = new Error(`HTTP ${res.status} from ${url}`);
          continue;
        }
        return res;
      } catch (e: any) {
        clearTimeout(timer);
        lastError = e;
        if (attempt >= retries) {
          const reason = e?.name === 'AbortError' ? 'timed out' : e?.message || 'failed';
          throw new HttpException(
            `Request to ${new URL(url).hostname} ${reason} after ${retries + 1} attempt(s)`,
            504
          );
        }
      }
    }
    throw lastError;
  }

  private logAiCaptionUsage(step: string, model: string, usage: any) {
    try {
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        step,
        model,
        usage: usage || null,
      });
      const fs = require('fs');
      fs.appendFileSync('/config/ai-caption-usage.jsonl', line + '\n');
    } catch (e) {
      // usage logging must never break caption generation
    }
  }
}

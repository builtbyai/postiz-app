'use client';

import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import Loading from '@gitroom/frontend/components/layout/loading';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';

export const AiCaptionButton: FC<{
  pictures?: Array<{ id: string; path: string }>;
  onCaption: (html: string) => void;
}> = (props) => {
  const { pictures, onCaption } = props;
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    if (loading) {
      return;
    }
    const firstImage = pictures?.[0];
    if (!firstImage?.id) {
      toaster.show(
        t(
          'ai_caption_needs_image',
          'Upload a photo first to generate an AI caption'
        ),
        'warning'
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/media/${firstImage.id}/ai-caption`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!data?.caption) {
        toaster.show(
          t('ai_caption_failed', 'Could not generate caption'),
          'warning'
        );
        return;
      }

      const html = String(data.caption)
        .split('\n')
        .map((line: string) => `<p>${line || ''}</p>`)
        .join('');

      onCaption(html);
    } catch (e) {
      toaster.show(
        t('ai_caption_failed', 'Could not generate caption'),
        'warning'
      );
    } finally {
      setLoading(false);
    }
  }, [loading, pictures, onCaption]);

  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content={t('ai_caption', 'Generate AI Caption')}
      onClick={generate}
      className={clsx(
        'relative select-none cursor-pointer rounded-[6px] w-[30px] h-[30px] bg-newColColor flex justify-center items-center'
      )}
    >
      {loading ? (
        <Loading height={15} width={15} type="spin" color="#fff" />
      ) : (
        <span className="text-[14px]">✨</span>
      )}
    </div>
  );
};

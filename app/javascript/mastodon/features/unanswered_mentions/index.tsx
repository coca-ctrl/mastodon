import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';

import { Helmet } from '@unhead/react/helmet';

import AtIcon from '@/tabler-icons/at.svg?react';
import { importFetchedStatuses } from 'mastodon/actions/importer';
import api, { getLinks } from 'mastodon/api';
import { Column } from 'mastodon/components/column';
import type { ColumnRef } from 'mastodon/components/column';
import { ColumnHeader } from 'mastodon/components/column_header';
import ScrollableList from 'mastodon/components/scrollable_list';
import { StatusQuoteManager } from 'mastodon/components/status_quoted';
import { useAppDispatch, useAppSelector } from 'mastodon/store';

const FIRST_PAGE = '/api/v1/unanswered_mentions';
const TITLE = '답장할 멘션';

interface Item {
  id: string;
}

interface ItemProps {
  id: string;
  onDismiss: (id: string) => void;
}

// ScrollableList가 자식에 넘기는 추가 props는 DOM으로 전달되지 않게 받아서 버린다
const UnansweredItem: FC<ItemProps> = ({ id, onDismiss }) => (
  <div className='unanswered__item'>
    <StatusQuoteManager
      id={id}
      contextType='unanswered'
      scrollKey='unanswered'
      showThread
    />
    <div className='unanswered__actions'>
      <button
        type='button'
        className='unanswered__dismiss'
        onClick={() => {
          onDismiss(id);
        }}
      >
        처리 완료
      </button>
    </div>
  </div>
);

const UnansweredMentions: FC<{ multiColumn?: boolean }> = ({ multiColumn }) => {
  const dispatch = useAppDispatch();
  const columnRef = useRef<ColumnRef>(null);

  const [ids, setIds] = useState<string[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const fetchPage = useCallback(
    async (url: string, reset: boolean) => {
      setLoading(true);

      try {
        const response = await api().get<Item[]>(url);
        const link = getLinks(response).refs.find((l) => l.rel === 'next');
        const incoming = response.data.map((status) => status.id);

        dispatch(importFetchedStatuses(response.data));
        setIds((prev) =>
          reset
            ? incoming
            : [...prev, ...incoming.filter((id) => !prev.includes(id))],
        );
        setNext(link ? link.uri : null);
      } catch {
        // 실패하면 현재 목록을 그대로 둔다
      } finally {
        setLoading(false);
      }
    },
    [dispatch],
  );

  useEffect(() => {
    void fetchPage(FIRST_PAGE, true);
  }, [fetchPage]);

  // 이 페이지에서 좋아요/북마크한 글은 서버 응답을 기다리지 않고 바로 숨긴다
  const doneKey = useAppSelector((state) =>
    ids
      .filter((id) => {
        const status = state.statuses.get(id);
        return !!status && (!!status.get('favourited') || !!status.get('bookmarked'));
      })
      .join(','),
  );

  const visible = useMemo(() => {
    const done = new Set(doneKey ? doneKey.split(',') : []);
    const gone = new Set(dismissed);
    return ids.filter((id) => !done.has(id) && !gone.has(id));
  }, [ids, doneKey, dismissed]);

  // 메뉴 배지 개수 갱신
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new Event('unanswered-refresh'));
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [doneKey, dismissed]);

  // 답글 게시가 끝나면 목록을 다시 불러온다
  const isSubmitting = useAppSelector(
    (state) => state.compose.get('is_submitting') as boolean,
  );
  const wasSubmitting = useRef(false);

  useEffect(() => {
    let timer: number | undefined;

    if (wasSubmitting.current && !isSubmitting) {
      timer = window.setTimeout(() => {
        setDismissed([]);
        void fetchPage(FIRST_PAGE, true);
      }, 800);
    }

    wasSubmitting.current = isSubmitting;

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [isSubmitting, fetchPage]);

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => [...prev, id]);
    api()
      .post(`/api/v1/unanswered_mentions/${id}/dismiss`)
      .catch(() => {
        setDismissed((prev) => prev.filter((item) => item !== id));
      });
  }, []);

  const handleLoadMore = useCallback(() => {
    if (next && !loading) {
      void fetchPage(next, false);
    }
  }, [next, loading, fetchPage]);

  const handleHeaderClick = useCallback(() => {
    columnRef.current?.scrollTop();
  }, []);

  const emptyMessage = '답장하지 않은 멘션이 없습니다.';

  return (
    <Column bindToDocument={!multiColumn} ref={columnRef} label={TITLE}>
      <ColumnHeader
        icon='at'
        iconComponent={AtIcon}
        title={TITLE}
        onClick={handleHeaderClick}
        multiColumn={multiColumn}
      />

      <ScrollableList
        scrollKey='unanswered_mentions'
        trackScroll
        hasMore={!!next}
        isLoading={loading}
        showLoading={loading && visible.length === 0}
        onLoadMore={handleLoadMore}
        emptyMessage={emptyMessage}
        bindToDocument={!multiColumn}
      >
        {visible.length > 0
          ? visible.map((id) => (
              <UnansweredItem key={id} id={id} onDismiss={handleDismiss} />
            ))
          : null}
      </ScrollableList>

      <Helmet>
        <title>{TITLE}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default UnansweredMentions;

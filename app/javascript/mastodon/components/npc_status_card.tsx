interface NpcInfo {
  id: number;
  name: string;
  emotion: string;
  image_url: string | null;
  body: string;
}

interface Props {
  npc: NpcInfo;
  backgroundUrl?: string | null;
  createdAt: string;
  onClick?: () => void;
}

export const NpcStatusCard: React.FC<Props> = ({
  npc,
  backgroundUrl,
  createdAt,
  onClick,
}) => {
  return (
    <div className='npc-status-card'>
      <div className='npc-status-card__image-wrap' onClick={onClick}>
        {backgroundUrl && (
          <img
            src={backgroundUrl}
            alt=''
            className='npc-status-card__background'
          />
        )}
        {npc.image_url && (
          <img src={npc.image_url} alt='' className='npc-status-card__image' />
        )}
        <div className='npc-status-card__overlay'>
          <div className='npc-status-card__name'>{npc.name}</div>
          <div
            className='npc-status-card__bubble'
            dangerouslySetInnerHTML={{ __html: npc.body }}
          />
        </div>
      </div>

      <div className='npc-status-card__actions'>
        <time className='npc-status-card__time'>
          {new Date(createdAt).toLocaleString('ko-KR')}
        </time>
      </div>
    </div>
  );
};
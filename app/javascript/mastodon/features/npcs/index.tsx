import { useState } from 'react';
import { Column } from 'mastodon/components/column';
import { NpcPanel } from './components/npc_panel';
import { BackgroundPanel } from './components/background_panel';
import { PresetPanel } from './components/preset_panel';

type TabKey = 'npc' | 'background' | 'preset';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'npc', label: 'NPC' },
  { key: 'background', label: '배경' },
  { key: 'preset', label: '프리셋' },
];

const NpcManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('npc');

  return (
    <Column bindToDocument label='NPC 관리'>
      <div className='npc-manager__tabs'>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type='button'
            className={`npc-manager__tab ${activeTab === tab.key ? 'npc-manager__tab--active' : ''}`}
            onClick={() => {
              setActiveTab(tab.key);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'npc' && <NpcPanel />}
      {activeTab === 'background' && <BackgroundPanel />}
      {activeTab === 'preset' && <PresetPanel />}
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default NpcManager;

# frozen_string_literal: true

class AddStorySoundToStatuses < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    add_column :statuses, :story_sound_id, :bigint
    add_index :statuses, :story_sound_id, where: 'story_sound_id IS NOT NULL', algorithm: :concurrently
  end
end

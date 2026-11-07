# frozen_string_literal: true

class CreateStorySounds < ActiveRecord::Migration[8.1]
  def change
    create_table :story_sounds do |t|
      t.references :account, null: false, foreign_key: { on_delete: :cascade }
      t.string :name, null: false, default: ''
      t.string :file_file_name
      t.string :file_content_type
      t.bigint :file_file_size
      t.datetime :file_updated_at
      t.integer :duration_ms, null: false, default: 0

      t.timestamps
    end
  end
end

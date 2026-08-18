class CreateStorySessions < ActiveRecord::Migration[8.1]
  def change
    create_table :story_sessions do |t|
      t.references :start_status, null: false, foreign_key: { to_table: :statuses }
      t.references :end_status, null: true, foreign_key: { to_table: :statuses }
      t.references :created_by_account, null: false, foreign_key: { to_table: :accounts }
      t.string :title
      t.string :thumbnail_file_name
      t.string :thumbnail_content_type
      t.bigint :thumbnail_file_size
      t.datetime :thumbnail_updated_at
      t.datetime :started_at, null: false
      t.datetime :ended_at

      t.timestamps
    end
  end
end
class CreateNpcImages < ActiveRecord::Migration[8.1]
  def change
    create_table :npc_images do |t|
      t.references :npc, null: false, foreign_key: true
      t.string :emotion, null: false, default: 'default'
      t.string :image_file_name
      t.string :image_content_type
      t.bigint :image_file_size
      t.datetime :image_updated_at

      t.timestamps
    end

    add_index :npc_images, [:npc_id, :emotion], unique: true
  end
end
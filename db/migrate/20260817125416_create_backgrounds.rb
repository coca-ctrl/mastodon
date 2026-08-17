class CreateBackgrounds < ActiveRecord::Migration[8.1]
  def change
    create_table :backgrounds do |t|
      t.references :account, null: false, foreign_key: true
      t.string :name, null: false
      t.string :image_file_name
      t.string :image_content_type
      t.bigint :image_file_size
      t.datetime :image_updated_at

      t.timestamps
    end
  end
end
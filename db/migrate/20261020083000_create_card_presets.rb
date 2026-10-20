class CreateCardPresets < ActiveRecord::Migration[8.1]
  def change
    create_table :card_presets do |t|
      t.references :account, null: false, foreign_key: { on_delete: :cascade }
      t.string :name, null: false

      t.string :background_color
      t.jsonb :background_gradient
      t.string :background_image_file_name
      t.string :background_image_content_type
      t.bigint :background_image_file_size
      t.datetime :background_image_updated_at
      t.string :background_size, null: false, default: 'cover'
      t.string :background_position, null: false, default: 'center'
      t.string :background_repeat, null: false, default: 'no-repeat'

      t.integer :border_width, null: false, default: 1
      t.string :border_style, null: false, default: 'solid'
      t.string :border_color
      t.integer :border_radius, null: false, default: 12
      t.string :border_image_file_name
      t.string :border_image_content_type
      t.bigint :border_image_file_size
      t.datetime :border_image_updated_at
      t.integer :border_image_slice, null: false, default: 30
      t.integer :border_image_width, null: false, default: 12
      t.string :border_image_repeat, null: false, default: 'round'

      t.string :text_color
      t.string :font_key, null: false, default: 'pretendard'
      t.integer :font_weight, null: false, default: 400
      t.integer :font_size, null: false, default: 15
      t.integer :line_height, null: false, default: 160
      t.integer :padding, null: false, default: 16

      t.timestamps
    end

  end
end
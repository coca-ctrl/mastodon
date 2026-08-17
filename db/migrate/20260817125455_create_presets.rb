class CreatePresets < ActiveRecord::Migration[8.1]
  def change
    create_table :presets do |t|
      t.references :account, null: false, foreign_key: true
      t.string :name, null: false
      t.references :npc, null: false, foreign_key: true
      t.string :npc_emotion, null: false
      t.references :background, null: true, foreign_key: true

      t.timestamps
    end
  end
end
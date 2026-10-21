# frozen_string_literal: true

class CreateMentionDismissals < ActiveRecord::Migration[8.1]
  def change
    create_table :mention_dismissals do |t|
      t.references :account, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.references :status, null: false, foreign_key: { on_delete: :cascade }
      t.datetime :created_at, null: false
    end

    add_index :mention_dismissals, [:account_id, :status_id], unique: true
  end
end
class CreateChatMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :chat_messages do |t|
      t.references :chat_conversation, null: false, foreign_key: true
      t.references :sender, null: false, foreign_key: { to_table: :users }
      t.text :content, null: false
      t.boolean :edited, default: false, null: false
      t.datetime :deleted_at
      t.timestamps
    end

    add_index :chat_messages, [:chat_conversation_id, :created_at]
  end
end
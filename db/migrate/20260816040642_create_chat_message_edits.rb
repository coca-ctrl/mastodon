class CreateChatMessageEdits < ActiveRecord::Migration[8.1]
  def change
    create_table :chat_message_edits do |t|
      t.references :chat_message, null: false, foreign_key: true
      t.text :previous_content, null: false
      t.datetime :edited_at, null: false
    end
  end
end
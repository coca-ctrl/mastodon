class CreateChatConversationParticipants < ActiveRecord::Migration[8.1]
  def change
    create_table :chat_conversation_participants do |t|
      t.references :chat_conversation, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.datetime :last_read_at
      t.datetime :joined_at, null: false
      t.datetime :left_at
      t.timestamps
    end

    add_index :chat_conversation_participants,
              [:chat_conversation_id, :user_id],
              unique: true,
              name: 'index_chat_participants_on_conversation_and_user'
  end
end
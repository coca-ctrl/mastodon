# frozen_string_literal: true

class Api::V1::BgmController < Api::BaseController
  before_action :require_user!

  def show
    render json: {
      enabled: Setting.bgm_enabled == true && Setting.bgm_video_id.present?,
      video_id: Setting.bgm_video_id.to_s,
      offset: Setting.bgm_offset.to_i,
      started_at: Setting.bgm_started_at.to_i,
      server_time: (Time.now.utc.to_f * 1000).to_i,
    }
  end
end

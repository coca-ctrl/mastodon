# frozen_string_literal: true

class Accounts::SwitchController < ApplicationController
  before_action :authenticate_user!

  def token
    render json: { token: form_authenticity_token }
    end

  # 보관함 목록 확인용 (테스트/화면 표시에 사용)
  def index
    stash = cookies.signed['_switch_sessions'] || []

    accounts = stash.filter_map do |entry|
      user = User.find_by(id: entry['user_id'])
      next unless user

      {
        session_id: entry['session_id'],
        user_id: user.id,
        username: user.account&.username,
        avatar: user.account&.avatar&.url,
      }
    end

    # 죽은 세션이 있었다면 쿠키도 같이 정리
    if accounts.size != stash.size
      valid_ids = accounts.map { |a| a[:session_id] }
      cookies.signed['_switch_sessions'] = {
        value: stash.select { |e| valid_ids.include?(e['session_id']) },
        expires: 1.year.from_now,
        httponly: true,
        same_site: :lax,
      }
    end

    render json: { accounts: accounts }
  end

  def update
    session_id = params[:session_id]
    stash = cookies.signed['_switch_sessions'] || []
    entry = stash.find { |e| e['session_id'] == session_id }

    unless entry
        redirect_to root_path, alert: '전환할 수 없는 계정입니다.'
        return
    end

    target_user = User.find_by(id: entry['user_id'])

    unless target_user && target_user.session_activations.active?(session_id)
      cookies.signed['_switch_sessions'] = {
        value: stash.reject { |e| e['session_id'] == session_id },
        expires: 1.year.from_now,
        httponly: true,
        same_site: :lax,
      }
      redirect_to root_path, alert: '만료된 세션입니다. 다시 로그인해주세요.'
      return
    end

    current_session_id = cookies.signed['_session_id']
    new_stash = stash.reject { |e| e['session_id'] == session_id }

    if current_session_id.present? && current_user
        new_stash.unshift('user_id' => current_user.id, 'session_id' => current_session_id)
    end

    cookies.signed['_switch_sessions'] = {
        value: new_stash.first(5),
        expires: 1.year.from_now,
        httponly: true,
        same_site: :lax,
    }

    # 핵심: Rails 세션(Warden) 자체를 target_user로 교체
    bypass_sign_in(target_user, scope: :user)

    cookies.signed['_session_id'] = {
        value: session_id,
        expires: 1.year.from_now,
        httponly: true,
        same_site: :lax,
    }

    redirect_to root_path
    end

  def destroy
    session_id = params[:session_id]
    stash = cookies.signed['_switch_sessions'] || []

    cookies.signed['_switch_sessions'] = {
      value: stash.reject { |e| e['session_id'] == session_id },
      expires: 1.year.from_now,
      httponly: true,
      same_site: :lax,
    }

    redirect_to root_path
  end
end
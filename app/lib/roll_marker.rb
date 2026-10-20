# frozen_string_literal: true

# 주사위/가위바위보 결과 마커. 서버가 게시 시점에 생성한 마커만 유효하다.
module RollMarker
  PATTERN = /\[(dice|rps):([^\[\]]*)\]/

  module_function

  # 본문에서 마커 원문 목록을 뽑는다
  def extract(text)
    text.to_s.enum_for(:scan, PATTERN).map { Regexp.last_match(0) }
  end

  # allowed에 없는 마커는 "[ "로 깨뜨려서 마커로 인식되지 않게 한다.
  # 같은 마커는 allowed에 있는 개수만큼만 살려둔다.
  def neutralize(text, allowed: [])
    remaining = allowed.tally

    text.to_s.gsub(PATTERN) do |marker|
      if remaining[marker].to_i.positive?
        remaining[marker] -= 1
        marker
      else
        "[ #{marker[1..]}"
      end
    end
  end
end
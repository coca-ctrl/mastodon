# frozen_string_literal: true

# 카드/NPC 게시물의 등장 연출. 저장 형식은 "shake,lines,glow" 같은 쉼표 문자열이다.
#   등장(하나만): shake(흔들리며 나타나기) | fade(페이드·슬라이드)
#   글자(하나만): lines(한 줄씩) | typewriter(한 글자씩)
#   빛남(선택):  glow
module EntranceEffect
  APPEAR = %w(shake fade).freeze
  TEXT = %w(lines typewriter).freeze
  EXTRA = %w(glow).freeze
  ALL = (APPEAR + TEXT + EXTRA).freeze

  def self.sanitize(raw)
    parts = raw.to_s.split(',').map(&:strip) & ALL

    result = [
      parts.find { |p| APPEAR.include?(p) },
      parts.find { |p| TEXT.include?(p) },
      parts.find { |p| EXTRA.include?(p) },
    ].compact

    result.empty? ? nil : result.join(',')
  end
end
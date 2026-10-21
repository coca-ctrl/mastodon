# frozen_string_literal: true

# 제한된 마크다운 변환기.
# TextFormatter가 멘션/해시태그/URL/주사위 마커를 자리표시자로 바꿔 넘기면,
# 여기서 블록(문단, 인용, 제목, 가로선, 정렬)과 인라인(굵게 등)을 변환한다.
# 출력 태그: p, br, strong, em, del, u, mark, blockquote, hr (모두 class 외 속성 없음)
class MarkdownRenderer
  BASIC_FEATURES = %i(bold italic).freeze
  PRIVILEGED_FEATURES = (BASIC_FEATURES + %i(strike quote heading underline highlight hr align)).freeze

  HEADING = /\A(\#{1,3})[ \t]+(\S.*)\z/
  HR = /\A[ \t]*-{3,}[ \t]*\z/
  QUOTE = /\A>(?:[ \t]|\z)/
  ALIGN_MAX_LINES = 100

  # 여는 토큰 => { 닫는 토큰 => 정렬 }
  ALIGN_OPENERS = {
    '|>' => { '<|' => :center, '>|' => :right },
    '|<' => { '<|' => :left },
  }.freeze

  LETTER_OR_NUMBER = /[\p{L}\p{N}]/

  class << self
    # 마크다운 적용 시작 시점. 환경변수 MARKDOWN_SINCE (예: 2026-10-21T00:00:00+09:00)
    # 설정되어 있지 않으면 기능 전체가 꺼진다.
    def since
      value = ENV['MARKDOWN_SINCE'].presence
      return if value.nil?

      Time.zone.parse(value)
    rescue ArgumentError
      nil
    end

    # 게시물에 적용할 문법 목록. nil이면 변환하지 않는다.
    def features_for(status)
      return unless status.local?

      cutoff = since
      return if cutoff.nil?
      return if status.created_at.present? && status.created_at < cutoff

      account = status.account
      privileged = Rails.cache.fetch("markdown:privileged:#{account.id}", expires_in: 5.minutes) do
        account.user&.can?(:administrator, :manage_npcs) ? true : false
      end

      privileged ? PRIVILEGED_FEATURES : BASIC_FEATURES
    end
  end

  def initialize(features)
    @features = Array(features).map(&:to_sym)
  end

  def render(raw)
    lines = raw.to_s.gsub("\r\n", "\n").tr("\r", "\n").split("\n", -1)
    render_blocks(lines, nil)
  end

  private

  def enabled?(feature)
    @features.include?(feature)
  end

  def render_blocks(lines, align)
    out = []
    para = []
    i = 0

    while i < lines.size
      line = lines[i]

      if line.strip.empty?
        flush_paragraph(out, para, align)
        i += 1
        next
      end

      block = special_block(lines, i, align)

      if block
        flush_paragraph(out, para, align)
        out << block[0]
        i = block[1]
      else
        para << line
        i += 1
      end
    end

    flush_paragraph(out, para, align)
    out.join
  end

  def flush_paragraph(out, para, align)
    return if para.empty?

    out << paragraph_html(para, align)
    para.clear
  end

  # 특수 블록이면 [html, 다음 줄 번호], 아니면 nil
  def special_block(lines, index, align)
    line = lines[index]

    if enabled?(:align) && (found = find_align(lines, index))
      return [render_blocks(found[:inner], found[:align]), found[:last] + 1]
    end

    if enabled?(:heading) && (match = line.match(HEADING))
      return [heading_html(match[1].length, match[2], align), index + 1]
    end

    return ['<hr class="md-hr" />', index + 1] if enabled?(:hr) && line.match?(HR)

    if enabled?(:quote) && line.match?(QUOTE)
      last = index
      last += 1 while last + 1 < lines.size && lines[last + 1].match?(QUOTE)
      quote_lines = lines[index..last].map { |l| l.sub(/\A>[ \t]?/, '') }
      return [%(<blockquote class="md-quote">#{paragraph_html(quote_lines, align)}</blockquote>), last + 1]
    end

    nil
  end

  def find_align(lines, index)
    first = lines[index].lstrip
    opener, closers = ALIGN_OPENERS.find { |open, _| first.start_with?(open) }
    return if opener.nil?

    limit = [index + ALIGN_MAX_LINES, lines.size - 1].min

    (index..limit).each do |j|
      candidate = j == index ? first.delete_prefix(opener) : lines[j]
      stripped = candidate.rstrip
      closer, kind = closers.find { |close, _| stripped.end_with?(close) }
      next if closer.nil?
      next if j == index && stripped.length <= closer.length # |><| 처럼 내용이 없는 경우

      inner = lines[index..j].dup
      inner[0] = first.delete_prefix(opener)
      inner[-1] = inner[-1].rstrip.delete_suffix(closer)
      return { inner: inner, align: kind, last: j }
    end

    nil
  end

  def paragraph_html(lines, align)
    "<p#{class_attr(align_class(align))}>#{lines.map { |l| inline(l) }.join('<br />')}</p>"
  end

  def heading_html(level, content, align)
    "<p#{class_attr("md-h#{level}", align_class(align))}><strong>#{inline(content)}</strong></p>"
  end

  def align_class(align)
    align ? "md-align-#{align}" : nil
  end

  def class_attr(*names)
    names = names.compact
    names.empty? ? '' : %( class="#{names.join(' ')}")
  end

  # ---- 인라인 ----

  def inline(text)
    html = ERB::Util.html_escape(text).to_s

    html = wrap(html, /(?<!\*)\*{3}(?![\s*])(.+?)(?<![\s*])\*{3}(?!\*)/, '<strong><em>', '</em></strong>') if enabled?(:bold) && enabled?(:italic)
    html = wrap(html, /(?<!\*)\*{2}(?![\s*])(.+?)(?<![\s*])\*{2}(?!\*)/, '<strong>', '</strong>') if enabled?(:bold)
    html = wrap(html, /(?<!\*)\*(?![\s*])(.+?)(?<![\s*])\*(?!\*)/, '<em>', '</em>') if enabled?(:italic)
    html = wrap(html, /(?<!~)~{2}(?![\s~])(.+?)(?<![\s~])~{2}(?!~)/, '<del>', '</del>') if enabled?(:strike)
    html = wrap(html, /(?<!\+)\+{2}(?![\s+])(.+?)(?<![\s+])\+{2}(?!\+)/, '<u>', '</u>') if enabled?(:underline)
    html = wrap(html, /(?<!=)={2}(?![\s=])(.+?)(?<![\s=])={2}(?!=)/, '<mark>', '</mark>') if enabled?(:highlight)

    html
  end

  # 안쪽에 글자/숫자가 하나도 없으면(예: "*^^*", "~~~~") 변환하지 않는다.
  def wrap(html, regex, open, close)
    html.gsub(regex) do
      whole = Regexp.last_match(0)
      inner = Regexp.last_match(1)
      inner.match?(LETTER_OR_NUMBER) ? "#{open}#{inner}#{close}" : whole
    end
  end
end
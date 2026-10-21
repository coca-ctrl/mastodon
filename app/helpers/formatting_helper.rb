# frozen_string_literal: true

module FormattingHelper
  SYNDICATED_EMOJI_STYLES = <<~CSS.squish
    height: 1.1em;
    margin: -.2ex .15em .2ex;
    object-fit: contain;
    vertical-align: middle;
    width: 1.1em;
  CSS

  ROLL_MARKER_PATTERN = RollMarker::PATTERN
  DICE_ROLL_PATTERN = /\A\d{1,3}D\d{1,4}\z/
  RPS_EMOJI = { 'scissors' => '✌️', 'rock' => '✊', 'paper' => '🖐️' }.freeze

  def html_aware_format(text, local, options = {})
    HtmlAwareFormatter.new(text, local, options).to_s
  end

  def linkify(text, options = {})
    TextFormatter.new(text, options).to_s
  end

  def url_for_preview_card(preview_card)
    preview_card.url
  end

  def extract_status_plain_text(status)
    PlainTextFormatter.new(status.text, status.local?).to_s
  end
  module_function :extract_status_plain_text

  def status_content_format(status)
    quoted_status = status.quote&.quoted_status if status.local?
    formatted = html_aware_format(status.text, status.local?, preloaded_accounts: [status.account] + (status.respond_to?(:active_mentions) ? status.active_mentions.map(&:account) : []), quoted_status: quoted_status, markdown: MarkdownRenderer.features_for(status))
    formatted = render_roll_markers(formatted) if status.local?
    npc_content_prefix(status) + formatted
  end

  def render_roll_markers(html)
    html.to_str.gsub(ROLL_MARKER_PATTERN) do
      whole = Regexp.last_match(0)
      kind = Regexp.last_match(1)
      args = Regexp.last_match(2).split(':', -1)
      (kind == 'dice' ? render_dice_marker(args) : render_rps_marker(args)) || whole
    end.html_safe # rubocop:disable Rails/OutputSafety
  end

  def render_dice_marker(args)
    roll, result = args
    return unless args.size == 2 && roll.match?(DICE_ROLL_PATTERN) && result.match?(/\A\d+\z/)

    %(<span class="dice_roll">#{roll}</span><span class="dice_result">#{result}</span>)
  end

  def render_rps_marker(args)
    name1, hand1, name2, hand2, winner = args
    return unless args.size == 5 && RPS_EMOJI.key?(hand1) && RPS_EMOJI.key?(hand2) && %w(0 1 2).include?(winner)

    name1 = ERB::Util.html_escape(CGI.unescape(name1).scrub)
    name2 = ERB::Util.html_escape(CGI.unescape(name2).scrub)
    result = { '0' => '무승부', '1' => "#{name1} 승", '2' => "#{name2} 승" }[winner]

    %(<span class="rps_roll1">#{name1} : #{RPS_EMOJI[hand1]}</span><span class="rps_roll2">#{name2} : #{RPS_EMOJI[hand2]}</span><span class="rps_result">#{result}</span>)
  end

  def npc_content_prefix(status)
    return ''.html_safe unless status.npc_id

    npc = status.npc
    return ''.html_safe unless npc

    image = npc.image_for(status.npc_emotion.presence || 'default')
    return ''.html_safe unless image

    image_url = image.image.url(:original)

    <<~HTML.squish.html_safe # rubocop:disable Rails/OutputSafety
      <img src="#{ERB::Util.html_escape(image_url)}" alt="#{ERB::Util.html_escape(npc.name)}" /><p><b>#{ERB::Util.html_escape(npc.name)}</b></p>
    HTML
  end

  def rss_status_content_format(status)
    prerender_custom_emojis(
      wrapped_status_content_format(status),
      status.emojis,
      style: SYNDICATED_EMOJI_STYLES
    ).to_str
  end

  def account_bio_format(account)
    html_aware_format(account.note, account.local?)
  end

  def account_field_value_format(field, with_rel_me: true)
    if field.verified? && !field.account.local?
      TextFormatter.shortened_link(field.value_for_verification)
    else
      html_aware_format(field.value, field.account.local?, with_rel_me: with_rel_me, with_domains: true, multiline: false)
    end
  end

  def markdown(text)
    Redcarpet::Markdown.new(Redcarpet::Render::HTML, escape_html: true, no_images: true).render(text).html_safe # rubocop:disable Rails/OutputSafety
  end

  private

  def wrapped_status_content_format(status)
    safe_join [
      rss_content_preroll(status),
      status_content_format(status),
      rss_content_postroll(status),
    ]
  end

  def rss_content_preroll(status)
    return unless status.spoiler_text?

    safe_join [
      tag.p { spoiler_with_warning(status) },
      tag.hr,
    ]
  end

  def spoiler_with_warning(status)
    safe_join [
      tag.strong { I18n.t('rss.content_warning', locale: available_locale_or_nil(status.language) || I18n.default_locale) },
      status.spoiler_text,
    ]
  end

  def rss_content_postroll(status)
    return unless status.preloadable_poll

    tag.p do
      poll_option_tags(status)
    end
  end

  def poll_option_tags(status)
    safe_join(
      status.preloadable_poll.options.map do |option|
        tag.send(status.preloadable_poll.multiple? ? 'checkbox' : 'radio', option, disabled: true)
      end,
      tag.br
    )
  end
end

(() => {
  'use strict';
  if (window.__mathCuratorDesktopFiltering) return;
  window.__mathCuratorDesktopFiltering = true;
  const selectors = 'ytd-rich-grid-media,ytd-video-renderer,ytd-compact-video-renderer,ytd-grid-video-renderer,ytd-playlist-video-renderer,ytd-rich-item-renderer,ytd-reel-item-renderer';
  const settings = {...MathConfig.DEFAULTS, enabled:true, level:'beginner', mode:'balanced'};
  const seen = new WeakMap();
  const txt = node => node?.textContent?.trim() || '';
  function extract(card) {
    const a = card.querySelector('a#video-title-link,a#video-title,a[href*="watch?v="],a[href*="/shorts/"]');
    const href = a?.getAttribute('href') || '';
    let id = '';
    try {
      const url = new URL(href, location.origin);
      id = url.searchParams.get('v') || (url.pathname.startsWith('/shorts/') ? url.pathname.split('/')[2] : '');
    } catch {}
    return {
      id,
      title: txt(card.querySelector('#video-title,#video-title-link,h3 yt-formatted-string,a[title]')) || a?.getAttribute('title') || '',
      channel: txt(card.querySelector('ytd-channel-name a,#channel-name a,#byline a')),
      context: txt(card.querySelector('#description-text,#description,.metadata-snippet-text,#metadata-line'))
    };
  }
  function scan() {
    if (!location.hostname.endsWith('youtube.com')) return;
    document.querySelectorAll(selectors).forEach(card => {
      const video = extract(card);
      const key = [video.id,video.title,video.channel,video.context].join('|');
      if (seen.get(card) === key) return;
      seen.set(card,key);
      const decision = MathScoring.decide(MathScoring.evaluate(video,settings),video,settings);
      const isShort = card.matches('ytd-reel-item-renderer') || !!card.querySelector('a[href^="/shorts/"]');
      card.classList.toggle('math-curator-desktop-hidden', isShort || decision === 'hide');
    });
    document.querySelectorAll('ytd-rich-shelf-renderer[is-shorts],ytd-reel-shelf-renderer')
      .forEach(el => el.classList.add('math-curator-desktop-hidden'));
  }
  let timer;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(scan, 250);
  };
  const observer = new MutationObserver(records => {
    if (records.some(r => r.addedNodes.length || r.removedNodes.length)) schedule();
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('yt-navigate-finish',schedule);
  scan();
})();

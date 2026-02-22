import { useState, useEffect, useCallback } from 'react';

export function useContext() {
  const [siteContext, setSiteContext] = useState(null);
  const [siteRules, setSiteRules] = useState({});
  const [enhancedCommands, setEnhancedCommands] = useState([]);

  const detectSite = useCallback(() => {
    const hostname = window.location.hostname;
    const url = window.location.href;
    const pathname = window.location.pathname;

    // Site-specific rules and enhanced commands
    const siteConfigs = {
      'google.com': {
        rules: { focusSearch: true },
        commands: [
          { pattern: /click result (\d+)/i, action: (match) => {
            const index = parseInt(match[1]);
            const results = document.querySelectorAll('h3');
            if (results[index - 1]) results[index - 1].click();
          }},
          { pattern: /search for (.+)/i, action: (match) => {
            const query = match[1];
            const searchBox = document.querySelector('input[name="q"]') || document.querySelector('textarea[name="q"]');
            if (searchBox) {
              searchBox.value = query;
              searchBox.form?.submit();
            }
          }},
        ],
      },
      'youtube.com': {
        rules: { skipAds: true, autoPlay: false, focusVideo: true },
        commands: [
          { pattern: /play|pause/i, action: () => {
            const button = document.querySelector('.ytp-play-button') || document.querySelector('button[aria-label*="Play"], button[aria-label*="Pause"]');
            button?.click();
          }},
          { pattern: /skip 30 seconds|skip/i, action: () => {
            const video = document.querySelector('video');
            if (video) video.currentTime += 30;
          }},
          { pattern: /fullscreen/i, action: () => {
            const button = document.querySelector('.ytp-fullscreen-button');
            button?.click();
          }},
          { pattern: /mute|unmute/i, action: () => {
            const button = document.querySelector('.ytp-mute-button');
            button?.click();
          }},
        ],
      },
      'twitter.com': {
        rules: {},
        commands: [
          { pattern: /like this/i, action: () => {
            const likeButton = document.querySelector('[data-testid="like"]');
            likeButton?.click();
          }},
          { pattern: /retweet/i, action: () => {
            const retweetButton = document.querySelector('[data-testid="retweet"]');
            retweetButton?.click();
          }},
          { pattern: /next tweet/i, action: () => {
            // Navigate to next tweet (simplified)
            window.scrollBy({ top: 500, behavior: 'smooth' });
          }},
          { pattern: /reply/i, action: () => {
            const replyButton = document.querySelector('[data-testid="reply"]');
            replyButton?.click();
          }},
        ],
      },
      'amazon.com': {
        rules: {},
        commands: [
          { pattern: /add to cart/i, action: () => {
            const addButton = document.querySelector('#add-to-cart-button') || document.querySelector('[id*="add-to-cart"]');
            addButton?.click();
          }},
          { pattern: /read reviews/i, action: () => {
            const reviewsLink = document.querySelector('a[href*="reviews"]');
            reviewsLink?.click();
          }},
          { pattern: /next product/i, action: () => {
            window.scrollBy({ top: 800, behavior: 'smooth' });
          }},
        ],
      },
      'gmail.com': {
        rules: { focusCompose: true, markRead: true },
        commands: [
          { pattern: /open email (\d+)/i, action: (match) => {
            const index = parseInt(match[1]);
            const emails = document.querySelectorAll('[role="main"] tr');
            if (emails[index - 1]) emails[index - 1].click();
          }},
          { pattern: /reply/i, action: () => {
            const replyButton = document.querySelector('[aria-label*="Reply"]');
            replyButton?.click();
          }},
          { pattern: /archive/i, action: () => {
            const archiveButton = document.querySelector('[aria-label*="Archive"]');
            archiveButton?.click();
          }},
          { pattern: /delete/i, action: () => {
            const deleteButton = document.querySelector('[aria-label*="Delete"]');
            deleteButton?.click();
          }},
          { pattern: /compose/i, action: () => {
            const composeButton = document.querySelector('[role="button"][gh="cm"]');
            composeButton?.click();
          }},
        ],
      },
      'reddit.com': {
        rules: {},
        commands: [
          { pattern: /upvote/i, action: () => {
            const upvoteButton = document.querySelector('[aria-label*="upvote"]');
            upvoteButton?.click();
          }},
          { pattern: /open post (\d+)/i, action: (match) => {
            const index = parseInt(match[1]);
            const posts = document.querySelectorAll('[data-testid="post-container"]');
            if (posts[index - 1]) posts[index - 1].querySelector('a')?.click();
          }},
          { pattern: /next post/i, action: () => {
            window.scrollBy({ top: 600, behavior: 'smooth' });
          }},
          { pattern: /collapse/i, action: () => {
            const collapseButton = document.querySelector('[aria-label*="Collapse"]');
            collapseButton?.click();
          }},
        ],
      },
    };

    const matchedSite = Object.keys(siteConfigs).find((domain) => hostname.includes(domain));
    if (matchedSite) {
      const config = siteConfigs[matchedSite];
      setSiteRules(config.rules);
      setEnhancedCommands(config.commands);
    } else {
      // Check for forms
      const forms = document.querySelectorAll('form');
      if (forms.length > 0) {
        setEnhancedCommands([
          { pattern: /fill this form/i, action: () => {
            const firstInput = document.querySelector('form input, form textarea, form select');
            firstInput?.focus();
          }},
        ]);
      } else {
        setEnhancedCommands([]);
      }
      setSiteRules({});
    }

    setSiteContext({ hostname, url, pathname });
  }, []);

  const matchEnhancedCommand = useCallback((transcript) => {
    for (const cmd of enhancedCommands) {
      const match = transcript.match(cmd.pattern);
      if (match) {
        try {
          cmd.action(match);
          return true;
        } catch (error) {
          console.error('Enhanced command error:', error);
        }
      }
    }
    return false;
  }, [enhancedCommands]);

  useEffect(() => {
    detectSite();

    // Re-detect on navigation
    const observer = new MutationObserver(() => {
      detectSite();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Listen for route changes in SPAs
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(detectSite, 100);
    };

    window.addEventListener('popstate', detectSite);

    return () => {
      observer.disconnect();
      history.pushState = originalPushState;
      window.removeEventListener('popstate', detectSite);
    };
  }, [detectSite]);

  return {
    siteContext,
    siteRules,
    enhancedCommands,
    matchEnhancedCommand,
  };
}

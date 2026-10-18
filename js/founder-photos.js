(() => {
    'use strict';
  
    // 写真を変更するときは、この対応表だけを編集します。
    const photos = new Map([
      ['17', 'images/founder-17.jpg'],
      ['25', 'images/founder-25.jpg']
    ]);
  
    function apply(avatar, careerId) {
      if (!avatar) return;
  
      avatar.querySelector('.founder-avatar__image')?.remove();
  
      const src = photos.get(String(careerId));
      avatar.classList.toggle('founder-avatar', Boolean(src));
  
      if (!src) return;
  
      avatar.setAttribute('aria-hidden', 'true');
  
      const image = new Image();
      image.className = 'founder-avatar__image';
      image.alt = '';
      image.decoding = 'async';
      image.hidden = true;
  
      image.addEventListener('load', () => {
        image.hidden = false;
      }, { once: true });
  
      image.addEventListener('error', () => {
        image.remove();
      }, { once: true });
  
      // イニシャルを残し、その上に読み込めた写真を表示します。
      avatar.append(image);
      image.src = src;
    }
  
    window.ImnormalFounderPhotos = { apply };
  
    function initializeHomePhotos() {
      document.querySelectorAll(
        '#home-consultation-list .home-consultation-card[data-career-id]'
      ).forEach((card) => {
        apply(
          card.querySelector('.home-career-avatar'),
          card.dataset.careerId
        );
      });
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener(
        'DOMContentLoaded',
        initializeHomePhotos,
        { once: true }
      );
    } else {
      initializeHomePhotos();
    }
  })();
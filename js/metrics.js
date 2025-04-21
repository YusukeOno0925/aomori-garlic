document.addEventListener('DOMContentLoaded', () => {
    fetch('/metrics/')
      .then(res => res.json())
      .then(({ users, stories, qa }) => {
        animateCount('user-count', users);
        animateCount('story-count', stories);
        animateCount('qa-count',     qa);
      })
      .catch(err => console.error('メトリクス取得エラー:', err));
  });
  
  /**
   * targetId の要素に向かって 0→targetValue までカウントアップする
   */
  function animateCount(targetId, targetValue) {
    const el = document.getElementById(targetId);
    const duration = 1200;
    const frameRate = 60;
    const totalFrames = Math.round(duration / (1000 / frameRate));
    let frame = 0;
    const countTo = Number(targetValue);
    const counter = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const current = Math.round(countTo * easeOutCubic(progress));
      el.textContent = current.toLocaleString();
      if (frame === totalFrames) {
        clearInterval(counter);
      }
    }, 1000 / frameRate);
  
    function easeOutCubic(t) {
      return (--t) * t * t + 1;
    }
}
/* Scroll position drives a straight trail. The bee sits on the line,
   and the honey fill stops where the bee is. */
(function () {
  var trail = document.getElementById("trail");
  var bee = document.querySelector(".trail-bee");
  var walk = document.querySelector(".spine-walk");
  if (!trail || !bee || !walk) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var frame = 0;
  var current = 0;

  function endY() {
    var end = trail.querySelector(".trail-end");
    if (!end) return Math.max(28, trail.offsetHeight - 28);
    return end.offsetTop + 22;
  }

  function targetY() {
    var rect = trail.getBoundingClientRect();
    var y = window.innerHeight * 0.62 - rect.top;
    var max = endY();
    if (y < 24) return 24;
    if (y > max) return max;
    return y;
  }

  function paint() {
    frame = 0;
    var y = targetY();
    if (reduce.matches) current = y;
    else current += (y - current) * 0.22;
    var px = current.toFixed(1) + "px";
    bee.style.top = px;
    walk.style.height = px;
    var spine = trail.querySelector(".spine");
    if (spine) spine.style.bottom = Math.max(0, trail.offsetHeight - endY() - 8) + "px";
    if (!reduce.matches && Math.abs(y - current) > 0.5) {
      frame = requestAnimationFrame(paint);
    }
  }

  function requestPaint() {
    if (!frame) frame = requestAnimationFrame(paint);
  }

  window.addEventListener("scroll", requestPaint, { passive: true });
  window.addEventListener("resize", requestPaint);
  if (typeof reduce.addEventListener === "function") reduce.addEventListener("change", requestPaint);
  requestPaint();
})();

"use strict";

(function () {
  const detailButtons = document.querySelectorAll(".detail-for-modal");

  detailButtons.forEach((el) => {
    el.addEventListener("click", (e) => {
      const postModal = document.querySelectorAll(".post-modal");
      const postModalOverlay = document.querySelectorAll(".overlay");

      document.addEventListener(
        "htmx:afterOnLoad",
        () => {
          postModal[0].classList.remove("hidden");
          postModalOverlay[0].classList.remove("hidden");
        },
        { once: true }
      );

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !postModal[0].classList.contains("hidden")) {
          postModal[0].classList.add("hidden");
          postModalOverlay[0].classList.add("hidden");
        }
      });

      postModalOverlay[0].addEventListener("click", (e) => {
        if (!postModal[0].classList.contains("hidden")) {
          postModal[0].classList.add("hidden");
          postModalOverlay[0].classList.add("hidden");
        }
      });
    });
  });
})();

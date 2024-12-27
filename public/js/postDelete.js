'use strict';

(function () {
    const postDeleteBtns = document.querySelectorAll('#deleteBtn');

    postDeleteBtns.forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();

            // Find the closest parent with the class 'post'
            const postElement = el.closest('.post');

            // Log or do something with the post element
            console.log(postElement);

            // You can delete the post element if needed
            postElement.remove();
            //window.location.reload();
        });
    });
})();

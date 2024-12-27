(function () {
    // Get the modal
    const modal = document.querySelector('.pic-modal');

    // Get the image and insert it inside the modal
    const images = document.querySelectorAll('#postPic');
    const fullImage = document.getElementById('fullPostPic');
    images.forEach(img => {
        img.onclick = function () {
            modal.style.display = 'block';
            fullImage.src = this.src;
        };
    });

    // Get the <span> element that closes the modal
    const span = document.getElementsByClassName('close')[0];

    // When the user clicks on <span> (x), close the modal
    span.onclick = function () {
        modal.style.display = 'none';
    };
})();

'use strict';

(function () {
    const updateButton = document.querySelector('#updateBtn');

    updateButton.addEventListener('click', e => {
        const profileUpdateModal = document.querySelector(
            '.profile-update-modal'
        );
        const profileUpdateOverlay = document.querySelector(
            '.profile-con .overlay'
        );

        updateButton.addEventListener('click', () => {
            profileUpdateModal.classList.remove('hidden');
            profileUpdateOverlay.classList.remove('hidden');
        });

        document.addEventListener('keydown', e => {
            if (
                e.key === 'Escape' &&
                !profileUpdateModal.classList.contains('hidden')
            ) {
                profileUpdateModal.classList.add('hidden');
                profileUpdateOverlay.classList.add('hidden');
            }
        });

        profileUpdateOverlay.addEventListener('click', e => {
            if (!profileUpdateModal.classList.contains('hidden')) {
                profileUpdateModal.classList.add('hidden');
                profileUpdateOverlay.classList.add('hidden');
            }
        });
    });

    const form = document.getElementById('updateUserForm');

    form.addEventListener('submit', event => {
        const password = document.getElementById('password').value;
        const confirmPassword =
            document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            event.preventDefault();
            window.alert('Password ve Repeat Pasword aynı olmalı.');
        }
    });
})();

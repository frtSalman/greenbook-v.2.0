'use strict';

const addReplyButtons = document.querySelectorAll('.add-reply');
const replyForms = document.querySelectorAll('.reply-form');

addReplyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        replyForms.forEach(form => {
            form.classList.remove('hidden');
        });
    });
});

replyForms.forEach(form => {
    form.addEventListener('click', () => {
        form.classList.remove('hidden');
    });
});

/* 

replyForms.classList.remove('hidden');
replyForms.classList.add('hidden');


*/

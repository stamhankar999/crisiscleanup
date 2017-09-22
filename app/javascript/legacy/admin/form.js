$(document).on('ready page:load', () => {
  $('.preview').on('click', () => {
    const html = $.parseHTML($('#form_html').val());
    $('#preview .lead').empty();

    $('#preview .lead').append(html);
  });
});

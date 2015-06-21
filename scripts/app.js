(function() {
    'use strict';

    var strad = {};
    window.strad = strad;


    strad.pageIndex = function() {
        document.addEventListener('DOMContentLoaded', function() {
            strad.prepareShowcasePopup();
            strad.makeMasonry(document.querySelector('.gallery'));
            strad.makeGalleryPopups(document.querySelectorAll('.gallery > article'));
        });
    };

    strad.pageOverviews = function() {
        document.addEventListener('DOMContentLoaded', function() {
            strad.prepareShowcasePopup();
            strad.makeGalleryPopups(document.querySelectorAll('.gallery > article'));
        });
    };

    strad.pageMap = function() {
        document.addEventListener('DOMContentLoaded', function() {
            strad.prepareShowcasePopup();

            var map = new L.Map(document.querySelector('.map'), {
                center: new L.LatLng(55.685784, 53.224869),
                zoom: 4,
                zoomAnimation: false
            });
            map.addLayer(new L.Yandex());

            var items = document.querySelectorAll('.meta > *'),
                item,
                link_html,
                marker;
            for (var i = 0; i < items.length; i++) {
                item = items[i];
                link_html = '<a href="' + item.getAttribute('data-url') + '" onclick="strad.makeShowcasePopup(' +
                    '\'' + item.getAttribute('data-tiles') + '\', ' +
                    item.getAttribute('data-width') + ', ' +
                    item.getAttribute('data-height') + ', ' +
                    '\'' + escapeSpecialChars(item.innerHTML).replace(/\n|\r/gm, '') + '\'' +
                    '); return false;">Смотреть</a>';
                marker = L.marker([ item.getAttribute('data-latitude'), item.getAttribute('data-longitude') ])
                    .addTo(map).bindPopup(item.innerHTML + link_html);
            }
        });
    };

    strad.pageSearch = function() {
        document.addEventListener('DOMContentLoaded', function() {
            var SEARCH_PARAM_STRING = 'q=';
            var SEARCH_QUERY_LENGTH_MIN = 3;
            var query_parts,
                search_query,
                xhr,
                i;

            if (~location.search.indexOf(SEARCH_PARAM_STRING)) {
                search_query = '';
                query_parts = location.search.slice(1, location.search.length).split('&');
                for (i = 0; i < query_parts.length; i++) {
                    if (~query_parts[i].indexOf(SEARCH_PARAM_STRING)) {
                        search_query = query_parts[i].slice(SEARCH_PARAM_STRING.length, query_parts[i].length);
                        search_query = decodeURI(search_query);
                        break;
                    }
                }

                document.querySelector('.search-form > input').value = search_query;

                if (search_query.length >= SEARCH_QUERY_LENGTH_MIN) {
                    xhr = new XMLHttpRequest();
                    xhr.open('GET', 'photos.json', true);

                    xhr.onload = function() {
                        var items_data = JSON.parse(this.response),
                            item_template = document.getElementById('item_template').textContent,
                            gallery = document.querySelector('.gallery'),
                            search_pattern = new RegExp(search_query, 'i'),
                            matched_items_count = 0;
                        for (var i = 0; i < items_data.length; i++) {
                            if (search_pattern.test(items_data[i].title) || search_pattern.test(items_data[i].description)) {
                                matched_items_count++;
                                gallery.innerHTML += '\n' + item_template
                                    .replace('{url}', items_data[i].url)
                                    .replace('{width}', items_data[i].width)
                                    .replace('{height}', items_data[i].height)
                                    .replace('{width_units}', items_data[i].width_units)
                                    .replace('{height_units}', items_data[i].height_units)
                                    .replace('{tiles}', items_data[i].tiles)
                                    .replace('{thumbnail}', items_data[i].thumbnail)
                                    .replace('{caption}', items_data[i].caption);
                            }
                        }

                        if (matched_items_count) {
                            strad.prepareShowcasePopup();
                            strad.makeMasonry(gallery);
                            strad.makeGalleryPopups(document.querySelectorAll('.gallery > article'));
                        } else {
                            // @todo "Ничего не найдено"
                        }
                    };
                    xhr.onerror = function() {
                        // @todo "Ошибка запроса" (xhr.status + ': ' + xhr.statusText)
                    };
                    xhr.ontimeout = function() {
                        // @todo "Превышен интервал ожидания запроса"
                    };

                    xhr.send();
                } else {
                    // @todo "Слишком короткий поисковой запрос"
                }
            } else {
                // @todo "Введите поисковой запрос"
            }
        });
    };



    strad.makeMasonry = function (gallery) {
        new Masonry(gallery, {
            itemSelector: 'article',
            columnWidth: 180
        });
    };

    strad.prepareShowcasePopup = function(showcase) {
        showcase = showcase || document.querySelector('.showcase.popup');
        var caption = showcase.querySelector('figcaption');

        strad.popup_showcase_map = null;
        strad.popup_showcase_wrapper = showcase;
        strad.popup_showcase_image_area = showcase.querySelector('.image-area');
        strad.popup_showcase_caption = caption;

        showcase.addEventListener('click', function (event) {
            if (event.target === showcase) {
                closeShowcasePopup();
            }
        });

        document.addEventListener('keyup', function (event) {
            var KEYCODE_ESC = 27;
            if (event.keyCode === KEYCODE_ESC) {
                closeShowcasePopup();
            }
        });

        function closeShowcasePopup() {
            showcase.style.display = 'none';
            destroyPopupMapIfExists();
            caption.innerHTML = '';
        }
    };


    strad.makeShowcasePopup = function (tiles_url, image_width, image_height, caption_html) {
        var showcase = strad.popup_showcase_wrapper,
            image_area = strad.popup_showcase_image_area,
            caption = strad.popup_showcase_caption;

        destroyPopupMapIfExists();
        showcase.style.display = '';
        strad.popup_showcase_map = strad.makeShowcase(tiles_url, image_width, image_height, showcase, image_area);
        if (caption_html) {
            caption.innerHTML = caption_html;
        }
    };

    strad.makeShowcase = function(tiles_url, image_width, image_height, showcase, image_area) {
        showcase = showcase || document.querySelector('.showcase');
        image_area = image_area || showcase.querySelector('.image-area');

        var map = L.map(image_area).setView(new L.LatLng(0, 0), 0);
        L.tileLayer.zoomify(tiles_url, {
            width: image_width,
            height: image_height,
            tolerance: 0.7
        }).addTo(map);
        var south_west = map.unproject([0, image_height], map.getMaxZoom());
        var north_east = map.unproject([image_width, 0], map.getMaxZoom());
        map.setMaxBounds(new L.LatLngBounds(south_west, north_east));

        return map;
    };

    strad.makeGalleryPopups = function (items) {
        for (var i = 0; i < items.length; i++) {
            var link = items[i].querySelector('a');
            var tiles_url = link.getAttribute('data-tiles');
            var image_width = link.getAttribute('data-width');
            var image_height = link.getAttribute('data-height');
            var caption_html = link.querySelector('header').innerHTML;

            if (tiles_url && image_width && image_height) {
                (function (tiles_url, image_width, image_height, caption_html) {
                    link.addEventListener('click', function (event) {
                        strad.makeShowcasePopup(tiles_url, image_width, image_height, caption_html);
                        event.preventDefault();
                        event.stopPropagation();
                    });
                })(tiles_url, image_width, image_height, caption_html);
            }
        }
    };



    function destroyPopupMapIfExists() {
        if (strad.popup_showcase_map) {
            strad.popup_showcase_map.remove();
            strad.popup_showcase_map = null;
        }
    }

    function escapeSpecialChars(string) {
        return string
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

})();

# About Alcolytics

Is an open source platform for a web and product analytics. 
It consists of a set of components: JavaScript tracking client for web applications; 
server-side data collector; services for geo-coding and detecting client device type; 
a new server deployment system.
[Read more](https://alco.readme.io/docs)

Платформа для web и продуктовой аналитики с открытым исходным кодом.
Включает в себя JavaScript трекер для сайта; сервис получения, обогащения,
сохранения и стриминга данных; сервисы гео-кодинга и определения типа клиентского устройства;
систему развертывания нового сервера.
[Подробнее](https://alco.readme.io/docs) 

![Alcolytics sheme](https://alcolytics.ru/media/alco-scheme.png)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Falcolytics%2Falco-tracker.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Falcolytics%2Falco-tracker?ref=badge_shield)

## About AlcoTracker

This service which collects data by HTTP from AlcoJS and 3rd-party tool then stores in ClickHouse dbms. On the fly enriches data using geo-coding and device detection services. Results are stored and optionally can be sent to the third-party services via API. Comes as a part of Alcolytics platform.

Сервис принимает данные от AlcoJS и сторонних сервисов, обогащает данными сервисов гео-кодинга и определения типа клиентского устройства. Результат  сохраняется в колоночную СУБД ClickHouse. Опционально передает во внешние сервисы по api. 

## Запуск в docker

Создаем образ

    docker build -t alcolytics/alco-tracker .
    
Запускаем контейнер
    
    docker run -d \
       --name alco-tracker \
       --hostname=alco-tracker \
       --restart=always \
       --net alconet \
       --env SXGEO_SERVICE=172.17.0.1:8087 \
       --env DEVICED_SERVICE=172.17.0.1:8086 \
       --env CH_DSN=http://172.17.0.1:8123/alcolytics \
       -p 8081:8080 \
       -v /srv/upload_ch:/usr/src/app/upload_ch \
       alcolytics/alco-tracker

## Запись данных в ClickHouse

Данные при получении приводятся в формат схемы БД, затем пишутся в файл. Раз в несколько секунд заменяется файл,
в который производится запись. Старый файл отправляется в кликхаус, при успешной записи удаляется, в противном случае
остается лежать до тех пор, пока до него не дойдет очередь на ручную обработку.
Файлы записываются в директорию контейнера /usr/src/app/upload_ch

## Кастомный конфиг

Имеется возможность перезаписать некоторые параметры конфигурации трекера. 
Для этого необходимо прокинуть в докер дополнительную директорию, предварительно создав ее.
    
    -v ./custom-config:/usr/src/app/config/custom \
    

Пример custom/config.yml

    client:
      common:
        trackClicks: true
        trackForms: true
        trackActivity: false
        allowHTTP: true


## Поддерживаемые переменные окружения

    SXGEO_SERVICE=host:port
    DEVICED_SERVICE=host:port
    MIXPANEL_TOKEN=mixpanel_project_token
    CH_DSN=http://host:8123/db_name
    PORT=8080


## License

The MIT License (MIT)

Copyright (c) 2017-2018 Dmitry Rodin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Falcolytics%2Falco-tracker.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Falcolytics%2Falco-tracker?ref=badge_large)
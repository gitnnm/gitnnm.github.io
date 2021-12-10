<?php
$full = json_decode(file_get_contents("https://iframe.video/api/movies_updates.json?api_token=425342f7cbdea93af4f5e95ae9600a09"))->updates;
$array = [];
foreach ($full as $item) {
    array_push($array,[
        'name' => $item->title_ru,
        'link' => $item->iframe_url
    ]);
}

echo json_encode($array);
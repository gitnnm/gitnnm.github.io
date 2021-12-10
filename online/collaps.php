<?php
$full = json_decode(file_get_contents("https://api1579319442.apicollaps.cc/video/news?token=35a07ab0c1dca8eea60fe07c48ebd857"))->results;
$array = [];
foreach ($full as $item) {
    $translate = $item->translator==""?"":' <span class="badge  badge-secondary"> '.$item->translator.'</span>';
	$eng = $item->origin_name==""?"":' <span class="badge  badge-success">' .$item->origin_name.'</span>';
	$quality = $item->quality==""?"":'  <span class="badge  badge-danger">'.$item->quality.'</span>';
    $year = $item->year==""?"":'  <span class="badge  badge-dark"> '.$item->year.'</span>';
	$season = $item->season==""?"":' <span class="badge  badge-info">Сезон '.$item->season.'</span>';
	$episode = $item->episode==""?"":' <span class="badge  badge-info">Серия '.$item->episode.'</span>';
	$imdb = $item->imdb==""?"":'  <span class="badge  badge-warning">IMDB:'.$item->imdb.'</span>';
	$kp = $item->kinopoisk==""?"":'  <span class="badge  badge-warning">KP:'.$item->kinopoisk.'</span>';
    array_push($array,[
        'name' => $item->name.$eng .$season .$episode .$translate  .$quality .$year .$imdb .$kp,
        'link' => $item->iframe_url
    ]);
}

echo json_encode($array);
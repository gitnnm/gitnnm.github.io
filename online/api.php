<?php
$film = urlencode($_GET['name']);
$all = json_decode(file_get_contents("https://api1579319442.apicollaps.cc/list?token=35a07ab0c1dca8eea60fe07c48ebd857&name=".$film))->results;
$array = [];
foreach ($all as $item) {
    $translate = $item->translator==""?"":' <span class="badge  badge-secondary"> '.$item->translator.'</span>';
	$eng = $item->origin_name==""?"":' <span class="badge  badge-success">' .$item->origin_name.'</span>';
	$quality = $item->quality==""?"":'  <span class="badge  badge-danger">'.$item->quality.'</span>';
 $year = $item->year==""?"":'  <span class="badge  badge-dark"> '.$item->year.'</span>';
  $age = $item->age==""?"":'  <span class="badge  badge-warning"> '.$item->age.'</span>';
   $imdb = $item->imdb==""?"":'  <span class="badge  badge-warning">IMDB:'.$item->imdb.'</span>';
   $kp = $item->kinopoisk==""?"":'  <span class="badge  badge-warning">KP:'.$item->kinopoisk.'</span>';
 			$video = $item->episodes->season_number==""?"":' <span class="badge  badge-info">Сезон '.$item->episodes->season_number.'</span>';
    array_push($array,[
        'name' => $item->name.$eng .$translate .$quality .$year .$imdb .$kp,
        'link' => $item->iframe_url
    ]);
}

echo json_encode($array);
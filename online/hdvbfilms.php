<?php
$full = json_decode(file_get_contents("http://apivb.info/api/movies_updates.json?token=55b952dbff62735435719c4f4707ae60"))->items;
$array = [];
foreach ($full as $item) {
    $translate = $item->translator==""?"":' <span class="badge  badge-secondary"> '.$item->translator.'</span>';
	$eng = $item->title_en==""?"":' <span class="badge  badge-success">' .$item->title_en.'</span>';
	$quality = $item->quality==""?"":'  <span class="badge  badge-danger">'.$item->quality.'</span>';
    $year = $item->year==""?"":'  <span class="badge  badge-dark"> '.$item->year.'</span>';
    array_push($array,[
        'name' => $item->title_ru.$eng .$translate  .$quality .$year,
        'link' => $item->iframe_url
    ]);
}

echo json_encode($array);
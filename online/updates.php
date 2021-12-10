<?php
$full = json_decode(file_get_contents("http://kodikapi.com/list?token=183357c2717eb92645a2fc0309fe675a&types=russian-movie,multi-part-film,russian-documentary-serial,documentary-serial,russian-serial&with_episodes=true&with_material_data=true"))->results;
$array = [];
foreach ($full as $item) {
    $translate = $item->translation->title=="Не требуется"?"":' <span class="badge  badge-secondary"> '.$item->translation->title.'</span>';
	$video = $item->last_season==""?"":' <span class="badge  badge-info">Сезон '.$item->last_season.'</span>';
	$episode = $item->last_episode==""?"":'  <span class="badge  badge-info">Серия '.$item->last_episode.'</span>';
	$quality = $item->quality==""?"":'  <span class="badge  badge-danger"> '.$item->quality.'</span>';
        $year = $item->year==""?"":'  <span class="badge  badge-dark"> '.$item->year.'</span>';
	$eng = $item->title_orig==""?"":' <span class="badge  badge-success">' .$item->title_orig.'</span>';
    array_push($array,[
        'name' => $item->title.$eng  .$translate .$video .$episode .$quality  .$year,
        'id' => $item->id,
        'link' => str_replace('http://','https://',$item->link)

    ]);
}

echo json_encode($array);

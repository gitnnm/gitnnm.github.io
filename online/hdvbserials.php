<?php
$full = json_decode(file_get_contents("http://apivb.info/api/serials_updates.json?token=55b952dbff62735435719c4f4707ae60&limit=42"))->items;
$array = [];
foreach ($full as $item) {
        $last = array_pop($item->serial_episodes);
    $translate = $item->translator=="Не требуется"?"":' <span class="badge  badge-secondary"> '.$item->translator.'</span>';
	$eng = $item->title_en==""?"":' <span class="badge  badge-success">' .$item->title_en.'</span>';
	$quality = $item->quality==""?"":'  <span class="badge  badge-danger">'.$item->quality.'</span>';
	 $year = $item->year==""?"":'  <span class="badge  badge-dark"> '.$item->year.'</span>';
        $video = $last->season_number==""?"":' <span class="badge  badge-info">Сезон '.$last->season_number.'</span>';
	$episode = $last->episodes_count==""?"":' <span class="badge  badge-info">Серия '.$last->episodes_count.'</span>';
    array_push($array,[
        'name' => $item->title_ru.$eng .$translate .$quality .$video .$episode .$year,
        'link' => $item->iframe_url
    ]);
}

echo json_encode($array);
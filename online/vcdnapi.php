<?php
$film = urlencode($_GET['name']);
$all = json_decode(file_get_contents("https://videocdn.tv/api/short?api_token=BHOXGxkW0F1dbPenCyVOhCsyg5NHxEPg&title=".$film))->data;
$array = [];
foreach ($all as $item) {
    $translate = $item->translation==""?"":' <span class="badge  badge-secondary"> '.$item->translation.'</span>';
	$eng = $item->orig_title==""?"":' <span class="badge  badge-success">' .$item->orig_title.'</span>';
	$quality = $item->quality==""?"":'  <span class="badge  badge-danger"> '.$item->quality.'</span>';
				$video = $item->seasons_count==""?"":' <span class="badge  badge-info">Сезон '.$item->seasons_count.'</span>';
	$episode = $item->episodes_count==""?"":' <span class="badge  badge-info">Серия '.$item->episodes_count.'</span>';
	$year = $item->year==""?"":'  <span class="badge  badge-dark"> '.$item->year.'</span>';
    array_push($array,[
         'name' => $item->title.$eng .$quality .$translate .$video .$episode .$year,
        'link' => $item->iframe_src
    ]);
}
 
echo json_encode($array);

<?php
@error_reporting(E_ALL);
@ini_set('error_reporting', E_ALL);

@header("Content-type: text/html; charset=UTF-8");
$ch = curl_init('http://sms.tru.io');
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows; U; Windows NT 5.1; ru; rv:1.9.2.8) Gecko/20100722 Firefox/3.6.8 ( .NET CLR 3.5.30729)');
curl_setopt($ch, CURLOPT_HEADER, 0);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 0);
curl_setopt($ch, CURLOPT_TIMEOUT, 120);
curl_setopt($ch, CURLOPT_REFERER, $refer);
$page = curl_exec($ch);
curl_close($ch);
?>


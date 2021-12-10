<!doctype html>
<html lang="ru">
<head>
<meta name="hdvb" content="c988c54031602a56877d50eb6206f9a3:955286f7f57a6b34dd75d87c17a0b069" />
<meta name="theme-color" content="#808080">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="ie=edge">
<meta name='iframe-verif' value='2cd7f8df54273f10ea7fff64f3d009df'>
<title>ITV.TRU.IO</title>
<script src="/ajax/jquery-3.3.1.min.js" type="text/javascript"></script>
<script src="/ajax/popper.min.js" type="text/javascript"></script>
<script src="/ajax/bootstrap.min.js" type="text/javascript"></script>
<body onload="start(document.forms[0])" onunload="cleartids()">
<link rel="stylesheet" href="/ajax/bootstrap.min.css" />
<link rel="stylesheet" href="/ajax/all.css">
<link rel="stylesheet" href="/ajax/animate.min.css" />
<style>
        .list-group-item{
            cursor: pointer;
        }
    </style>
</head>
<body>
<div class="container">
<div class="row">
<div class="col-12 my-1">
<nav class="navbar navbar-default bg-default">
  <a class="navbar-brand"><button type="button" class="btn btn-outline-primary" onclick="location.href = '/'"><b><i>Главная</i></b></button>
<button type="button" class="btn btn-outline-secondary"><b><i>Kodik</i></b></button>
<button type="button" class="btn btn-outline-success" onclick="location.href = '/hdvb.php'"><b><i>HDVB</i></b></button>
<button type="button" class="btn btn-outline-info" onclick="location.href = '/vcdn.php'"><b><i>VIDEOCDN</i></b></button></a>
  <form class="form-inline">
    <input class="form-control mr-sm-2 form-control my-1 filmName" type="text" placeholder="Поиск по названию..." aria-label="Поиск по названию...">
  </form>
</nav>
</div>
<div class="col-0 my-1 player">
</div>
<div class="my-1 col-12 film-list-class">
<div class="list-group film-list">
<div class="text-center">
<div class="spinner-grow text-primary" role="status">
<span class="sr-only">Loading...</span>
</div>
<div class="spinner-grow text-secondary" role="status">
<span class="sr-only">Loading...</span>
</div>
<div class="spinner-grow text-success" role="status">
<span class="sr-only">Loading...</span>
</div>
<div class="spinner-grow text-danger" role="status">
<span class="sr-only">Loading...</span>
</div>
<div class="spinner-grow text-warning" role="status">
<span class="sr-only">Loading...</span>
</div>
<div class="spinner-grow text-info" role="status">
<span class="sr-only">Loading...</span>
</div>
<div class="spinner-grow text-dark" role="status">
<span class="sr-only">Loading...</span>
</div>
</div>
</div>
</div>
</div>
<script type="text/javascript">
          $(function () {
            $.get("/updates.php",function (response) {
                $(".film-list").html("");
                $(".film-list").append('<span class="badge badge-light"><i><b><h4>Последние обновления:</h4></b></i></span>');
                var data = JSON.parse(response);
                data.forEach(function (item) {
                    let link = item['link'];
                $(".film-list").append('<span data-toggle="tooltip" data-placement="bottom"  class="list-group-item text-primary" data-link='+link+' data-id='+item['id']+'>'+item['name']+'</span>');
                })
            })


            $('[data-toggle="tooltip"]').tooltip()
            var req = null;
            $(document).on("input",'.filmName',function () {
                 $(".film-list").html('<h2 class="text-center"><div class="spinner-grow text-info" role="status"><span class="sr-only">Loading...</span></div></h2>');
                 if(req!==null) req.abort();
                var film = $(this).val();
                if(film===""){
                    get(); return;
                }
                req = $.get('/api.php?name='+film,function (response) {
                    $(".film-list").html("");
                    var data = JSON.parse(response);
                    data.forEach(function (item) {
                        var link = item['link'];
                        $(".film-list").append('<span data-toggle="tooltip" data-placement="bottom"  class="list-group-item text-primary" data-link='+link+' data-id='+item['id']+'>'+item['name']+'</span>');
                    })
                })
            })
$(document).on("click",'[data-link]',function () {
                $(".film-list-class").addClass("col-md-4");
                $(".film-list-class").removeClass("col-12");
                $(".player").addClass('col-md-8');
                $(".player").removeClass('col-0');
                var link = $(this).data('link');
                var width = $(".player").width();
                var height = width*9/16;
                history.replaceState(null,null,'#!/'+$(this).data('id'));
                console.log(height);
                $(".player").html('<iframe class="w-100" style="height: '+height+'px" frameborder="0" allowfullscreen src="'+link+'"></iframe>')
            })
        })
    </script>
<div class="fixed-bottom bg-white">
<p class="m-0 text-center">&copy; 2018-2020  "ITV.TRU.IO"</p>
</div>
</div>
<script src="https://weblion777.github.io/hdvb.js" async></script>
</body>
</html>
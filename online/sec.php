 <?php

 $user = "Fizer"; // please replace with your user
 $pass = "Fizerpassword123"; // please replace with your passwd
 // two ; was missing

 $useroptions = ['cost' => 8,];
 $userhash    = password_hash($user, PASSWORD_BCRYPT, $useroptions);
 $pwoptions   = ['cost' => 8,];
 $passhash    = password_hash($pass, PASSWORD_BCRYPT, $pwoptions);

 echo $userhash;
 echo "<br />";
 echo $passhash;

 ?>
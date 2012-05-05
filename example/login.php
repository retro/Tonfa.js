<?php
// Step 6
$data = 'client_id=' . '818672ba28dfbd8a1c1f' . '&' .
		'client_secret=' . getenv('GITHUB_ISSUES_APP_KEY') . '&' .
		'code=' . urlencode($_GET['code']);

$ch = curl_init('https://github.com/login/oauth/access_token');
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);

preg_match('/access_token=([0-9a-f]+)/', $response, $out);
echo $out[1];
curl_close($ch);
?>
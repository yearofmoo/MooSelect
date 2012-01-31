<?php

$results = array(
  array(
    'group' => true,
    'name' => 'Grouped',
    'results' => array(
      array(
        'text' => 'Label One',
        'value' => 'one',
        'extra' => 'cool'
      ),
      array(
        'text' => 'Label Two',
        'value' => 'two'
      ),
    )
  ),
  array(
    'text' => 'Label Three',
    'value' => 'three'
  ),
  array(
    'text' => 'Label Four',
    'value' => 'four'
  ),
  array(
    'text' => 'Label Five',
    'value' => 'five'
  )
);

$res = array();
$q = '';//$_GET['q'];
foreach($results as $r) {
  $match = preg_match('#'.$q.'#i',$r['text']);
  if($r['value'] == $q || $match>0) {
    $res[]=$r;
  }
}
echo json_encode($res);

?>

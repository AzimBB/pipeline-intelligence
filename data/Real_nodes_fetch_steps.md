You need to query this website https://overpass-turbo.eu/ with :

----
/*
This is an example Overpass query.
Try it out by pressing the Run button above!
You can find more examples with the Load tool.
*/
[out:json][timeout:60];
// Define the search box for Turkmenistan, Uzbekistan, and Kazakhstan
(
  way["man_made"="pipeline"]["substance"="gas"](35.0,58.0,46.0,82.0);
  node["man_made"="pipeline"]["substance"="gas"](35.0,58.0,46.0,82.0);
);
// Output the geometry (coordinates)
out geom;

----

And get all the data as "Data" not "Map"
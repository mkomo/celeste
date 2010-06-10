#!/bin/sh
i=1;
while read line
do
wget $line -O $i.jpg;
i=`expr $i + 1`;
done

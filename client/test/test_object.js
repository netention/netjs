/*test( "hello test", function() {
  ok( 1 == "1", "Equality passed!" );
  ok( 0 == "1", "Failed!" );
});*/

test("New objects", function() {
    ok( objNew().id, "Generate ID randomly when none specified" );

    var s = "specificID";
    strictEqual(s, objNew(s).id, "object ID may be specifid");


    ok( objNew().createdAt, "Has createdAt metadata");
    
    strictEqual( objNew("id").id, "id", "New Object with supplied ID" );
    strictEqual( objNew("id", "name").name, "name", "New Object with supplied name" );
});

test("Object compact & expand", function() {
	var x = objNew();
	x.add({id: 'tag1',strength: 1});
	x.add({id: 'tag1',strength: 0.5});
	x.add('tag2');

	var y = objCompact(x);
	ok(y.v.length == 3);
	ok(typeof y.v[0] == "string"); //the first should be turned into a string since it has strenght==1 (the default)
	ok(typeof y.v[1] != "string");
	ok(typeof y.v[2] == "string");
	//ok(true, JSON.stringify(y));

	var z = objExpand(y);
	ok(z.value.length == 3);
	//ok(true, JSON.stringify(z));

});

test("Object editing", function() {
       
    var x = objNew();
    var y = { id: 'tag'  };
    
    objAddValue(x, y );   
    ok( x.value.length == 1, "value object added to object");
    
    {
        var z = { id: 'property', value: 'value'  };
        objAddValue(y, z);
        ok(x.value[0].value, "attached sub-object" );
    }
    
    {
        objAddDescription(x, 'described');
        ok(x.value.length == 2, 'description added to value list');
        strictEqual(objDescription(x), 'described', 'description readable');
    }
    
    objRemoveValue(x, 0);
    ok( x.value.length == 1, "value object removed from object");    
    
    
    ok( !objName(x), "object has no default name" );
    strictEqual( objName(objName(x, 'named')) , 'named', "object name may be specified" );
    
});

test("Tag calclulations", function() {
    var x = objNew();
    objAddValue(x, { id: 'integer', value: 5 }); //should not be counted
    objAddValue(x, { id: 'Earthquake', strength: 1.0, value: [ ] }); 
    objAddValue(x, { id: 'Earthquake', strength: 0.75, value: [ ] });  //should not be counted twice, uses max of strengths of the same type
    objAddValue(x, { id: 'Happy', strength: 0.25, value: [ ] });  //should not be counted twice    
    
    deepEqual( objTags(x, false), [ 'Earthquake', 'Happy' ], 'list of unique tags' );

    deepEqual( objTagStrength(x), { 'Earthquake': 0.8, 'Happy': 0.2 }, 'normalized strengths of tags' );

    objAddValue(x, { id: 'html', value: 'nothing' });
    deepEqual( objTags(x), [ 'Earthquake', 'Happy' ], 'objTags without primitives, when primitives present' );
    deepEqual( objTags(x, true).length, 4, 'objTags with primitives, when primitives present' );
    
    var y = objNew();
    objAddValue(y, { id: 'Earthquake', strength: 1.0, value: [ ] }); 
        
    var z = objNew();    
    deepEqual( objTagRelevance(x, z), 0.0, 'tag relevancy: when no tags present' );
    //deepEqual( objTagRelevance(x, y), 0.8, 'tag relevancy: when some tags present' );
    
});

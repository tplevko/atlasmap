/**
 * Copyright (C) 2017 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.atlasmap.core;

import static org.junit.Assert.assertEquals;

import java.util.Collections;

import org.junit.Test;

import io.atlasmap.api.AtlasException;
import io.atlasmap.json.module.JsonModule;
import io.atlasmap.json.v2.JsonField;
import io.atlasmap.v2.AtlasMapping;
import io.atlasmap.v2.Collection;
import io.atlasmap.v2.Mapping;
import io.atlasmap.v2.MappingType;
import io.atlasmap.v2.Mappings;


public class DefaultAtlasContextCollectionExpansionTest {

    @Test
    public void shouldNotExponentialyGrowExpandedCollectionMappings() throws AtlasException {
        final AtlasMapping mapping = new AtlasMapping();

        final DefaultAtlasContext context = new DefaultAtlasContext(new DefaultAtlasContextFactory(), mapping);
        context.setSourceModules(Collections.singletonMap("source", new JsonModule()));

        final DefaultAtlasSession session = new DefaultAtlasSession(mapping);
        session.setSourceDocument("source", "{ \"array\": [ { \"property\": 1 }, { \"property\": 2 }, { \"property\": 3 } ] }");

        final Collection baseMapping = new Collection();
        baseMapping.setMappingType(MappingType.COLLECTION);

        final Mappings mappings = new Mappings();
        final Mapping singleMapping = new Mapping();
        singleMapping.setMappingType(MappingType.MAP);
        final JsonField nestedArrayField = new JsonField();
        nestedArrayField.setDocId("source");
        nestedArrayField.setPath("/array<>/property");
        singleMapping.getInputField().add(nestedArrayField);
        mappings.getMapping().add(singleMapping);
        baseMapping.setMappings(mappings);

        assertEquals(3, context.extractCollectionMappings(session, baseMapping).size());
        assertEquals(3, context.extractCollectionMappings(session, baseMapping).size());
        assertEquals(3, context.extractCollectionMappings(session, baseMapping).size());
    }

}

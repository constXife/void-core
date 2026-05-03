fn preview_spaces_json(state: &PreviewState) -> String {
    let items = state
        .catalog
        .spaces
        .iter()
        .map(preview_space_json)
        .collect::<Vec<_>>();
    format!("[{}]", items.join(","))
}

fn preview_space_detail_json(state: &PreviewState, space: &PreviewSpace) -> String {
    let template = preview_template_for_space(state, space);
    format!(
        "{{\"space\":{},\"template\":{},\"directory_items\":{},\"resources\":[],\"placements\":[]}}",
        preview_current_space_json(state, space),
        preview_template_json(&template),
        preview_directory_items_json(state, Some(space.id.as_str()))
    )
}

fn preview_summary_json(state: &PreviewState) -> String {
    let active_space_ids = state
        .catalog
        .spaces
        .iter()
        .filter(|space| !space.state.eq_ignore_ascii_case("archived"))
        .map(|space| json_string(&space.id))
        .collect::<Vec<_>>();
    format!(
        "{{\"configured\":true,\"exists\":true,\"path\":{},\"summary\":{{\"role_count\":0,\"template_count\":{},\"space_count\":{},\"directory_item_count\":{},\"active_space_ids\":[{}],\"widgets_count\":{}}},\"mode\":\"foundation-preview\"}}",
        json_string(&state.catalog.client_root_path),
        state.catalog.templates.len(),
        state.catalog.spaces.len(),
        state.directory_items.len(),
        active_space_ids.join(","),
        state.catalog.widget_count
    )
}

fn preview_catalog_json(state: &PreviewState) -> String {
    let spaces = state
        .catalog
        .spaces
        .iter()
        .map(preview_space_json)
        .collect::<Vec<_>>();
    let templates = state
        .catalog
        .templates
        .values()
        .map(|template| {
            let block_types = template
                .blocks
                .iter()
                .map(|block| json_string(&block.block_type))
                .collect::<Vec<_>>();
            format!(
                "{{\"key\":{},\"version\":1,\"blocks_count\":{},\"block_types\":[{}]}}",
                json_string(&template.key),
                template.blocks.len(),
                block_types.join(",")
            )
        })
        .collect::<Vec<_>>();
    format!(
        "{{\"configured\":true,\"exists\":true,\"path\":{},\"catalog\":{{\"roles\":[],\"templates\":[{}],\"spaces\":[{}],\"directory_items\":{}}},\"source\":{{\"spaces\":{},\"resources\":{},\"placements\":{},\"templates\":{},\"roles\":0}},\"mode\":\"foundation-preview\"}}",
        json_string(&state.catalog.client_root_path),
        templates.join(","),
        spaces.join(","),
        preview_directory_items_json(state, None),
        state.catalog.spaces.len(),
        state.catalog.resource_count,
        state.catalog.placement_count,
        state.catalog.templates.len()
    )
}

fn preview_dashboard_json(state: &PreviewState, space: &PreviewSpace) -> String {
    let template = preview_template_for_space(state, space);
    let hidden_block_ids = preview_hidden_block_ids(state, space);
    let block_types = template
        .blocks
        .iter()
        .map(|block| json_string(&block.block_type))
        .collect::<Vec<_>>();
    format!(
        "{{\"configured\":true,\"exists\":true,\"path\":{},\"space_id\":{},\"space\":{{\"id\":{},\"title\":{},\"dashboard_template\":{}}},\"template\":{},\"blocks_count\":{},\"blocks\":{},\"block_order\":{},\"hidden_block_ids\":{},\"visible_block_ids\":{},\"visible_blocks\":{},\"block_types\":[{}],\"mode\":\"foundation-preview\"}}",
        json_string(&state.catalog.client_root_path),
        json_string(&space.id),
        json_string(&space.id),
        localized_text_json(&space.title),
        json_string(&space.dashboard_template),
        preview_template_json(&template),
        template.blocks.len(),
        preview_blocks_json(state, space, &template, &hidden_block_ids),
        preview_block_order_json(&template),
        json_string_array(&hidden_block_ids),
        preview_visible_block_ids_json(&template, &hidden_block_ids),
        preview_visible_blocks_json(state, space, &template, &hidden_block_ids),
        block_types.join(",")
    )
}

fn preview_workspace_json(state: &PreviewState, current_space: &PreviewSpace) -> String {
    format!(
        "{{\"workspace\":{},\"diagnostics\":[],\"mode\":\"foundation-preview\"}}",
        preview_workspace_object_json(state, current_space)
    )
}

fn preview_workspace_object_json(state: &PreviewState, current_space: &PreviewSpace) -> String {
    let spaces = state
        .catalog
        .spaces
        .iter()
        .map(|space| preview_current_space_json(state, space))
        .collect::<Vec<_>>();
    format!(
        "{{\"spaces\":[{}],\"current_space\":{},\"resources\":[],\"directory_items\":{}}}",
        spaces.join(","),
        preview_current_space_json(state, current_space),
        preview_directory_items_json(state, Some(current_space.id.as_str()))
    )
}

fn preview_save_dashboard(state: &mut PreviewState, requested_space_id: Option<&str>, body: &str) -> String {
    let Some(space_id) = preview_current_space(state, requested_space_id).map(|space| space.id.clone()) else {
        return "{\"error\":\"space_not_found\"}".to_string();
    };
    let viewer = preview_viewer();
    let Some(space) = preview_current_space(state, Some(space_id.as_str())).cloned() else {
        return "{\"error\":\"space_not_found\"}".to_string();
    };
    let mut blocks = extract_dashboard_blocks(body);
    if blocks.is_empty() {
        blocks = preview_template_for_space(state, &space).blocks;
    }
    let requested_order = extract_json_string_array(body, "block_order");
    let hidden_block_ids = extract_json_string_array(body, "hidden_block_ids");
    let ordered_blocks = preview_order_dashboard_blocks(blocks, &requested_order);
    let valid_hidden_block_ids = preview_filter_hidden_block_ids(&ordered_blocks, &hidden_block_ids);
    let template = PreviewTemplate {
        key: space.dashboard_template.clone(),
        blocks: ordered_blocks.clone(),
    };
    if let Err(error) = write_preview_template_file(&state.client_root_dir(), &template) {
        return format!(
            "{{\"error\":\"dashboard_template_write_failed\",\"message\":{}}}",
            json_string(&error.to_string())
        );
    }
    if let Err(error) =
        write_preview_dashboard_hidden_blocks(
            &state.client_root_dir(),
            &viewer.user_id,
            &space.id,
            &valid_hidden_block_ids,
        )
    {
        return format!(
            "{{\"error\":\"dashboard_overlay_write_failed\",\"message\":{}}}",
            json_string(&error.to_string())
        );
    }
    state.reload_catalog();
    let Some(current_space) = preview_current_space(state, Some(space_id.as_str())) else {
        return format!(
            "{{\"error\":\"space_not_found\",\"space_id\":{}}}",
            json_string(&space_id)
        );
    };
    format!(
        "{{\"saved\":true,\"space_id\":{},\"template_id\":{},\"blocks_count\":{},\"hidden_block_ids\":{},\"workspace\":{},\"diagnostics\":[]}}",
        json_string(&space_id),
        json_string(&space.dashboard_template),
        ordered_blocks.len(),
        json_string_array(&valid_hidden_block_ids),
        preview_workspace_object_json(state, current_space)
    )
}

fn preview_order_dashboard_blocks(
    blocks: Vec<PreviewTemplateBlock>,
    requested_order: &[String],
) -> Vec<PreviewTemplateBlock> {
    let mut block_map = BTreeMap::new();
    let mut original_order = Vec::new();
    for block in blocks {
        if !original_order.contains(&block.id) {
            original_order.push(block.id.clone());
        }
        block_map.insert(block.id.clone(), block);
    }

    let mut ordered_ids = Vec::new();
    for block_id in requested_order {
        let normalized = block_id.trim();
        if normalized.is_empty() || ordered_ids.iter().any(|existing| existing == normalized) {
            continue;
        }
        if block_map.contains_key(normalized) {
            ordered_ids.push(normalized.to_string());
        }
    }
    for block_id in original_order {
        if !ordered_ids.iter().any(|existing| existing == &block_id) {
            ordered_ids.push(block_id);
        }
    }
    ordered_ids
        .into_iter()
        .filter_map(|block_id| block_map.remove(&block_id))
        .collect()
}

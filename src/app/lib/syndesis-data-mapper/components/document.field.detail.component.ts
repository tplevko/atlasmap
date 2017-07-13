/*
    Copyright (C) 2017 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import { Component, Input, ElementRef, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeUrl, SafeStyle} from '@angular/platform-browser';

import { ConfigModel } from '../models/config.model';
import { Field } from '../models/field.model';
import { DocumentDefinition } from '../models/document.definition.model';
import { MappingModel, FieldMappingPair } from '../models/mapping.model';

import { DocumentManagementService } from '../services/document.management.service';

import { LineMachineComponent } from './line.machine.component';
import { ModalWindowComponent } from './modal.window.component';

import { PropertyFieldEditComponent } from './property.field.edit.component';
import { ConstantFieldEditComponent } from './constant.field.edit.component';
import { FieldEditComponent } from './field.edit.component';

@Component({
    selector: 'document-field-detail',
    template: `
        <div class="DocumentFieldDetailComponent" #fieldDetailElement on-mouseover='handleMouseOver($event)' 
            *ngIf="fieldShouldBeVisible()" [attr.draggable]="field.isTerminal()" (dragstart)="startDrag($event)" (drop)="endDrag($event)" 
            (dragenter)="dragEnterLeave($event, true)" (dragleave)="dragEnterLeave($event, false)" (dragover)="allowDrop($event)">
            <div [attr.class]='getCssClass()' (click)="handleMouseClick($event)" *ngIf="field.visibleInCurrentDocumentSearch">
                <div style="float:left;">
                    <div style="display:inline-block; width:24px;" *ngIf="!field.isSource()">
                        <i [attr.class]='getMappingClass()'></i>
                        <i [attr.class]='getTransformationClass()'></i>
                    </div>
                    <div class="spacer" [attr.style]="getSpacerWidth()">&nbsp;</div>
                    <div *ngIf="!field.isTerminal()" style="display:inline-block;">
                        <i [attr.class]="getParentToggleClass()"></i>
                        <i *ngIf="!field.isCollection" class="fa fa-folder parentFolder"></i>
                        <i *ngIf="field.isCollection" class="fa fa-list-ul parentFolder"></i>
                    </div>
                    <div *ngIf="field.isTerminal()" style="display:inline-block;">
                        <i [attr.class]="getFieldTypeIcon()"></i>                        
                    </div>
                        <label>{{ field.getFieldLabel(false) }}</label>
                    </div>
                    <div style="float:right; width:24px; text-align:right;" *ngIf="field.isSource()">
                        <i [attr.class]='getTransformationClass()'></i>
                        <i [attr.class]='getMappingClass()'></i>
                    </div>
                    <div class="propertyFieldIcons" style="float:right; text-align:right" *ngIf="fieldIsEditable()">
                        <i class="fa fa-edit link" aria-hidden="true" (click)="editField($event);"></i>
                        <i class="fa fa-trash link" aria-hidden="true" (click)="removeField($event);"></i>
                    </div>
                    <div class="clear"></div>
            </div>
            <div class="childrenFields" *ngIf="!field.isTerminal() && !field.collapsed">
                <document-field-detail #fieldDetail *ngFor="let f of field.children"
                    [field]="f" [lineMachine]="lineMachine" [modalWindow]="modalWindow"
                    [cfg]="cfg"></document-field-detail>
            </div>
        </div>
    `
})

export class DocumentFieldDetailComponent {
    @Input() cfg: ConfigModel;
    @Input() field: Field;
    @Input() lineMachine: LineMachineComponent;
    @Input() modalWindow: ModalWindowComponent;    

    @ViewChild('fieldDetailElement') fieldDetailElement:ElementRef;
    @ViewChildren('fieldDetail') fieldComponents: QueryList<DocumentFieldDetailComponent>;

    private isDragDropTarget: boolean = false;

    constructor(private sanitizer: DomSanitizer) {}

    public startDrag(event: any): void {
        // event's data transfer store isn't available during dragenter/dragleave/dragover, so we need
        // to store this info in a global somewhere since those methods depend on knowing if the 
        // dragged field is 
        this.cfg.currentDraggedField = this.field;
    }

    public dragEnterLeave(event: any, entering: boolean): void {
        if (!this.field.isTerminal() || (this.field.isSource() == this.cfg.currentDraggedField.isSource())) {
            this.isDragDropTarget = false;
            return;
        }
        this.isDragDropTarget = entering;
    }

    public allowDrop(event: any): void { 
        if (!this.field.isTerminal() || (this.field.isSource() == this.cfg.currentDraggedField.isSource())) {
            this.isDragDropTarget = false;
            return;
        }       
        event.preventDefault();
        this.isDragDropTarget = true;
    }

    public endDrag(event: any): void {
        this.isDragDropTarget = false;
        if (!this.field.isTerminal() || (this.field.isSource() == this.cfg.currentDraggedField.isSource())) {           
            var desc: string = this.field.isSource() ? "source" : "target"; 
            console.log("Ignoring drop event, this field isn't terminal or it is a " + desc + " like the dropped field.");
            return;
        }               

        var droppedField: Field = this.cfg.currentDraggedField;
        if (droppedField == null) {
            console.log("Ignoring drop event, can't find dropped field.");
            return;
        }  

        console.log("Creating new mapping for dropped field '" + droppedField.name + "' and '" + this.field.name + "'.");
        this.cfg.mappingService.addNewMapping(droppedField);
        this.cfg.mappingService.fieldSelected(this.field);

    }

    public fieldIsEditable(): boolean {
        return this.field.isPropertyOrConstant() || this.field.userCreated;
    }

    public getFieldTypeIcon(): string {
        if (this.field.enumeration) {
            return "fa fa-file-text-o";
        }
        if (this.field.isCollection) {
            return "fa fa-list-ul";
        }
        if (this.field.docDef.initCfg.type.isXML()) {
            return this.field.isAttribute ? "fa fa-at" : "fa fa-code";
        }
        return "fa fa-file-o";
    }

    public fieldShouldBeVisible(): boolean {
        var partOfMapping: boolean = this.field.partOfMapping;
        return partOfMapping ? this.cfg.showMappedFields : this.cfg.showUnmappedFields;
    }

    public getTransformationClass(): string {
        if (!this.field.partOfMapping || !this.field.partOfTransformation) {
            return "partOfMappingIcon partOfMappingIconHidden";
        }
        return "partOfMappingIcon fa fa-bolt";
    }

    public getMappingClass(): string {
        if (!this.field.partOfMapping) {
            return "partOfMappingIcon partOfMappingIconHidden";
        }
        var clz: string = "fa fa-circle";
        if (!this.field.isTerminal() && this.field.hasUnmappedChildren) {
            clz = "fa fa-adjust";
        }
        return "partOfMappingIcon " + clz;
    }

    public getCssClass(): string {
        var cssClass: string = "fieldDetail";
        if (this.field.selected) {
            cssClass += " selectedField";
        }
        if (!this.field.isTerminal()) {
            cssClass += " parentField";
        }
        if (!this.field.isSource()) {
            cssClass += " outputField";
        }
        if (this.isDragDropTarget) {
            cssClass += " dragHover";
        }
        return cssClass;
    }

    public getElementPosition(): any {
        var x: number = 0;
        var y: number = 0;

        var el: any = this.fieldDetailElement.nativeElement;
        while (el != null) {
            x += el.offsetLeft;
            y += el.offsetTop;
            el = el.offsetParent;
        }
        return { "x": x, "y":y };
    }

    public handleMouseOver(event: MouseEvent): void {
        if (this.field.isTerminal()) {
            this.lineMachine.handleDocumentFieldMouseOver(this, event, this.field.isSource());
        }
    }

    public getParentToggleClass() {
        return "arrow fa fa-angle-" + (this.field.collapsed ? "right" : "down");
    }

    public handleMouseClick(event: MouseEvent): void {
        this.cfg.mappingService.fieldSelected(this.field);
        setTimeout(() => {
            this.lineMachine.redrawLinesForMappings();
        }, 10);
    }

    public getFieldDetailComponent(field: Field): DocumentFieldDetailComponent {
        if (this.field == field) {
            return this;
        }
        for (let c of this.fieldComponents.toArray()) {
            var returnedComponent: DocumentFieldDetailComponent = c.getFieldDetailComponent(field);
            if (returnedComponent != null) {
                return returnedComponent;
            }
        }
        return null;
    }

    public editField(event: any): void {
        event.stopPropagation();
        var self: DocumentFieldDetailComponent = this;
        var oldPath: string = this.field.path;
        this.modalWindow.reset();
        this.modalWindow.confirmButtonText = "Save";
        this.modalWindow.parentComponent = this;
        var isProperty: boolean = this.field.isProperty();
        var isConstant: boolean = this.field.isConstant();
        this.modalWindow.headerText = isProperty ? "Edit Property" : (isConstant ? "Edit Constant" : "Edit Field");
        this.modalWindow.nestedComponentInitializedCallback = (mw: ModalWindowComponent) => {
            if (isProperty) {
                var propertyComponent: PropertyFieldEditComponent = mw.nestedComponent as PropertyFieldEditComponent;
                propertyComponent.initialize(self.field);
            } else if (isConstant) {
                var constantComponent: ConstantFieldEditComponent = mw.nestedComponent as ConstantFieldEditComponent;
                constantComponent.initialize(self.field);
            } else {
                var fieldComponent: FieldEditComponent = mw.nestedComponent as FieldEditComponent;
                fieldComponent.isSource = self.field.isSource();
                fieldComponent.initialize(self.field, this.field.docDef, false);
            }
        };
        this.modalWindow.nestedComponentType = isProperty ? PropertyFieldEditComponent 
            : (isConstant ? ConstantFieldEditComponent : FieldEditComponent)
        this.modalWindow.okButtonHandler = (mw: ModalWindowComponent) => {
            var newField: Field = null;            
            if (isProperty) {
                var propertyComponent: PropertyFieldEditComponent = mw.nestedComponent as PropertyFieldEditComponent;
                newField = propertyComponent.getField();
            } else if (isConstant) {
                var constantComponent: ConstantFieldEditComponent = mw.nestedComponent as ConstantFieldEditComponent;
                newField = constantComponent.getField();
            } else {
                var fieldComponent: FieldEditComponent = mw.nestedComponent as FieldEditComponent;
                newField = fieldComponent.getField();
            }
            self.field.copyFrom(newField);
            
            self.field.docDef.updateField(self.field, oldPath);

            self.cfg.mappingService.saveCurrentMapping();
        };
        this.modalWindow.show();
    }

    public removeField(event: any): void {
        event.stopPropagation();
        var self: DocumentFieldDetailComponent = this;
        this.modalWindow.reset();
        this.modalWindow.confirmButtonText = "Remove";
        this.modalWindow.parentComponent = this;        
        if (this.field.isPropertyOrConstant()) {
            this.modalWindow.headerText = this.field.isProperty() ? "Remove Property?" : "Remove Constant?";
        } else {
            this.modalWindow.headerText = "Remove field?";
        }
        this.modalWindow.message = "Are you sure you want to remove '" + this.field.displayName + "'?";
        this.modalWindow.okButtonHandler = (mw: ModalWindowComponent) => {
            self.cfg.mappings.removeFieldFromAllMappings(self.field);
            self.field.docDef.removeField(self.field);
            self.cfg.mappingService.saveCurrentMapping();
        };
        this.modalWindow.show();
    }

    public getSpacerWidth(): SafeStyle {
        var width: string = (this.field.fieldDepth * 30).toString();
        return this.sanitizer.bypassSecurityTrustStyle("display:inline; margin-left:" + width + "px");
    }
}
